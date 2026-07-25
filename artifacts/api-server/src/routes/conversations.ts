import { Router, type IRouter } from "express";
import { db, conversationsTable, propertiesTable, propertyImagesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  CreateConversationBody,
  GetConversationParams,
  SendMessageParams,
  SendMessageBody,
  GetConversationResponse,
  ListConversationsResponse,
  GetPropertyResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { isOffTopic, OFF_TOPIC_RESPONSE_AR } from "../services/ai/guardrails";
import type { SellerData } from "../services/ai/state-machine";
import { toApiProperty } from "../lib/property-mapper";

const router: IRouter = Router();

const AGENT_URL = process.env.AGENT_URL ?? "http://host.docker.internal:8000";
// How many recent turns to send the agent (sliding memory window).
const AGENT_HISTORY_TURNS = 8;

type ApiProperty = ReturnType<typeof toApiProperty>;

// Discriminated-union cards (docs/adr/0001). The broker sends property ids;
// we hydrate them into full records before storing.
type ContactInfo = { phone?: string; email?: string; whatsapp?: string; hours?: string };
type MessageCard =
  | { type: "properties"; properties: ApiProperty[] }
  | { type: "contact"; contact: ContactInfo };
type BrokerCard =
  | { type: "properties"; propertyIds?: string[] }
  | { type: "contact"; contact?: ContactInfo };

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  // Legacy field: conversations stored before the cards contract. Kept for
  // rendering old messages; new messages write `cards` only.
  properties?: ApiProperty[];
  cards?: MessageCard[];
};

// Given the ids the agent found, load the full Property records (+images) and
// return them in the SAME order the agent presented them, so the chat cards
// match the reply text.
async function hydrateProperties(ids: string[]): Promise<ApiProperty[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, ids));
  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(inArray(propertyImagesTable.propertyId, ids));

  const imagesByProperty = new Map<string, typeof images>();
  for (const img of images) {
    const list = imagesByProperty.get(img.propertyId) ?? [];
    list.push(img);
    imagesByProperty.set(img.propertyId, list);
  }

  const byId = new Map(
    rows.map((r) => [r.id, toApiProperty(r, imagesByProperty.get(r.id) ?? [])]),
  );
  // Preserve the agent's ordering; drop any id that no longer resolves.
  return ids.map((id) => byId.get(id)).filter((p): p is ApiProperty => p != null);
}

const GREETING: Record<string, string> = {
  buyer_search: "مرحباً! أنا مساعدك العقاري في AqariTalk. أخبرني، ما نوع العقار الذي تبحث عنه؟ 🏠",
  seller_listing: "مرحباً! سأساعدك في تسجيل عقارك بأفضل طريقة ممكنة. ما نوع العقار الذي تريد إدراجه؟ 🔑",
};

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

router.get("/conversations", authenticate, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, req.user!.userId))
    .orderBy(conversationsTable.updatedAt);

  res.json(ListConversationsResponse.parse(rows));
});

router.post("/conversations", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, propertyId, market } = parsed.data;

  const greetingMsg: Message = {
    role: "assistant",
    content: GREETING[type] ?? "مرحباً!",
    timestamp: new Date().toISOString(),
  };

  const initialState = type === "seller_listing" ? "greeting" : "type_collection";

  const [conversation] = await db
    .insert(conversationsTable)
    .values({
      userId: req.user!.userId,
      propertyId: propertyId ?? null,
      type,
      messages: [greetingMsg],
      extractedData: {},
      currentState: initialState,
      status: "active",
      market: market ?? "JO",
    })
    .returning();

  res.status(201).json(GetConversationResponse.parse(conversation));
});

router.get("/conversations/:id", authenticate, async (req, res): Promise<void> => {
  const parsed = GetConversationParams.safeParse({ id: paramStr(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [convo] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, parsed.data.id),
        eq(conversationsTable.userId, req.user!.userId),
      ),
    );

  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(GetConversationResponse.parse(convo));
});

router.post(
  "/conversations/:id/messages",
  authenticate,
  async (req, res): Promise<void> => {
    const params = SendMessageParams.safeParse({ id: paramStr(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = SendMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, params.data.id),
          eq(conversationsTable.userId, req.user!.userId),
        ),
      );

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (convo.status !== "active") {
      res.status(409).json({ error: "Conversation is no longer active" });
      return;
    }

    const userText = body.data.content;

    // --- Guardrail ---
    if (isOffTopic(userText)) {
      const offTopicMsg: Message = {
        role: "assistant",
        content: OFF_TOPIC_RESPONSE_AR,
        timestamp: new Date().toISOString(),
      };
      const existingMsgs = (convo.messages as Message[]) ?? [];
      const userMsg: Message = { role: "user", content: userText, timestamp: new Date().toISOString() };
      const updatedMessages = [...existingMsgs, userMsg, offTopicMsg];
      const [updated] = await db
        .update(conversationsTable)
        .set({ messages: updatedMessages, updatedAt: new Date() })
        .where(eq(conversationsTable.id, convo.id))
        .returning();
      res.json({ message: offTopicMsg, conversation: GetConversationResponse.parse(updated) });
      return;
    }

    // --- Build history for the agent (drop timestamps) ---
    // Only the last AGENT_HISTORY_TURNS turns are sent: local CPU inference
    // slows as the prompt grows, and the model's context is small (4096),
    // so a sliding window keeps each reply fast and within budget.
    const existingMessages = (convo.messages as Message[]) ?? [];
    const history = existingMessages
      .slice(-AGENT_HISTORY_TURNS)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const userMsg: Message = {
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };

    // --- Call the Python broker-agent sidecar ---
    // 180s timeout: local Gemma on CPU can take 30s-2min per multi-step reply.
    // Still bounds the worst case so a stalled sidecar can't hang forever.
    let aiText = "";
    let brokerCards: BrokerCard[] = [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const resp = await fetch(`${AGENT_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`agent sidecar HTTP ${resp.status}`);
      // Cast is safe: a body without `reply` falls through to the "" fallback;
      // a non-object body throws here and is handled by the catch below.
      const data = (await resp.json()) as { reply?: string; cards?: BrokerCard[] };
      aiText = (data.reply ?? "").trim();
      if (!aiText) aiText = "أعد المحاولة من فضلك.";
      brokerCards = Array.isArray(data.cards) ? data.cards : [];
    } catch (err) {
      req.log.error({ err }, "Agent sidecar call failed");
      aiText = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.";
    } finally {
      clearTimeout(timer);
    }

    // Hydrate the broker's cards: property ids become full records so the web
    // can render them. A hydration failure must not break the reply.
    const cards: MessageCard[] = [];
    for (const card of brokerCards) {
      try {
        if (card.type === "properties" && Array.isArray(card.propertyIds)) {
          const properties = await hydrateProperties(card.propertyIds.map(String));
          if (properties.length > 0) cards.push({ type: "properties", properties });
        } else if (card.type === "contact" && card.contact) {
          cards.push({ type: "contact", contact: card.contact });
        }
        // Unknown card types are dropped here; clients also ignore unknowns.
      } catch (err) {
        req.log.error({ err }, "Card hydration failed");
      }
    }

    const aiMsg: Message = {
      role: "assistant",
      content: aiText,
      timestamp: new Date().toISOString(),
      ...(cards.length > 0 ? { cards } : {}),
    };

    const updatedMessages = [...existingMessages, userMsg, aiMsg];

    const [updated] = await db
      .update(conversationsTable)
      .set({
        messages: updatedMessages,
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, convo.id))
      .returning();

    res.json({
      message: aiMsg,
      conversation: GetConversationResponse.parse(updated),
    });
  },
);

// Submit listing: create a property from seller conversation extracted data
router.post(
  "/conversations/:id/submit-listing",
  authenticate,
  async (req, res): Promise<void> => {
    const id = paramStr(req.params.id);

    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, id),
          eq(conversationsTable.userId, req.user!.userId),
        ),
      );

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (convo.type !== "seller_listing") {
      res.status(400).json({ error: "Only seller_listing conversations can submit a listing" });
      return;
    }

    if (convo.currentState !== "submit_ready" && convo.currentState !== "guidance_review") {
      res.status(400).json({ error: "Listing is not ready for submission yet" });
      return;
    }

    const data = (convo.extractedData ?? {}) as SellerData;

    // Idempotent: if property was already created from this conversation, return it
    if (convo.propertyId) {
      const [existing] = await db
        .select()
        .from(propertiesTable)
        .where(eq(propertiesTable.id, convo.propertyId));
      if (existing) {
        const existingImages = await db
          .select()
          .from(propertyImagesTable)
          .where(eq(propertyImagesTable.propertyId, existing.id));
        res.json(GetPropertyResponse.parse(toApiProperty(existing, existingImages)));
        return;
      }
    }

    if (!data.category || !data.transactionMode) {
      res.status(400).json({ error: "Property type and transaction mode are required" });
      return;
    }

    const currency = convo.market === "SA" ? "SAR" : "JOD";

    const insertValues: Record<string, unknown> = {
      createdBy: req.user!.userId,
      listingDirection: "offering",
      propertyType: data.category,
      transactionMode: data.transactionMode as "sale" | "rent" | "lease",
      status: "draft",
      market: convo.market ?? "JO",
      priceCurrency: currency,
    };

    if (data.price != null) insertValues.price = String(data.price);
    if (data.city != null) insertValues.city = data.city;
    if (data.district != null) insertValues.district = data.district;
    if (data.areaSqm != null) insertValues.areaSqm = String(data.areaSqm);
    if (data.rooms != null) insertValues.rooms = data.rooms;
    if (data.bathrooms != null) insertValues.bathrooms = data.bathrooms;
    if (data.floorNumber != null) insertValues.floorNumber = data.floorNumber;
    if (data.parking != null) insertValues.parking = data.parking;
    if (data.description != null) insertValues.description = data.description;
    if (data.furnished != null) {
      const furnishedMap: Record<string, string> = {
        furnished: "furnished",
        مفروش: "furnished",
        "semi-furnished": "semi_furnished",
        "نصف مفروش": "semi_furnished",
        unfurnished: "unfurnished",
        "غير مفروش": "unfurnished",
      };
      insertValues.furnishedStatus = furnishedMap[data.furnished] ?? "unfurnished";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [property] = await db.insert(propertiesTable).values(insertValues as any).returning();

    // Link conversation to the created property and mark completed
    await db
      .update(conversationsTable)
      .set({ propertyId: property.id, status: "completed", currentState: "submit_ready", updatedAt: new Date() })
      .where(eq(conversationsTable.id, convo.id));

    req.log.info({ propertyId: property.id, conversationId: convo.id }, "Listing submitted from conversation");

    res.status(201).json(GetPropertyResponse.parse(property));
  },
);

export default router;
