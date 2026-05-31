import { Router, type IRouter } from "express";
import { db, conversationsTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
import { createChat, type ChatHistory } from "../services/ai/client";
import { isOffTopic, OFF_TOPIC_RESPONSE_AR } from "../services/ai/guardrails";
import { buildSystemPrompt } from "../services/ai/context-builder";
import { extractBuyerCriteria, extractSellerData, isSubmitIntent } from "../services/ai/extraction";
import {
  advanceBuyerState,
  advanceSellerState,
  type BuyerState,
  type SellerState,
  type BuyerCriteria,
  type SellerData,
} from "../services/ai/state-machine";

const router: IRouter = Router();

type Message = { role: "user" | "assistant"; content: string; timestamp: string };

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

    // --- Extract & advance state ---
    const existingData = (convo.extractedData ?? {}) as BuyerCriteria | SellerData;
    const currentState = convo.currentState as BuyerState | SellerState;
    const market = convo.market ?? "JO";

    let newData: BuyerCriteria | SellerData;
    let newState: BuyerState | SellerState;

    if (convo.type === "buyer_search") {
      newData = extractBuyerCriteria(userText, existingData as BuyerCriteria);
      newState = advanceBuyerState(currentState as BuyerState, newData as BuyerCriteria);
    } else {
      newData = extractSellerData(userText, existingData as SellerData);
      newState = advanceSellerState(currentState as SellerState, newData as SellerData);

      const LATE_SELLER_STATES: SellerState[] = ["details_collection", "guidance_review", "submit_ready"];
      if (isSubmitIntent(userText) && LATE_SELLER_STATES.includes(currentState as SellerState)) {
        newState = "submit_ready";
      }
    }

    // --- Build Gemini history ---
    const existingMessages = (convo.messages as Message[]) ?? [];
    const systemPrompt = buildSystemPrompt(convo.type, newState, newData, market);

    const userMsg: Message = {
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };

    // --- Call Gemini ---
    let aiText = "";
    try {
      // Build history: strip leading model messages (chat must start with user turn).
      const mapped: ChatHistory = existingMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));
      const firstUserIdx = mapped.findIndex((h) => h.role === "user");
      const history = firstUserIdx >= 0 ? mapped.slice(firstUserIdx) : [];

      const chat = createChat(systemPrompt, history);
      const result = await chat.sendMessage({ message: userText });
      aiText = (result.text ?? "").trim();
      // Strip any leaked chain-of-thought blocks (fallback guard)
      aiText = aiText.replace(/^(THOUGHT|THINKING):[\s\S]*?\n\n/i, "").trim();
      if (!aiText) aiText = "أعد المحاولة من فضلك.";
    } catch (err) {
      req.log.error({ err }, "Gemini call failed");
      const errMsg = String((err as { message?: string })?.message ?? "");
      const isQuota =
        (err as { status?: number })?.status === 429 ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota");
      aiText = isQuota
        ? "عذراً، تم الوصول إلى الحد اليومي لطلبات الذكاء الاصطناعي. يرجى المحاولة لاحقاً."
        : "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.";
    }

    const aiMsg: Message = {
      role: "assistant",
      content: aiText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...existingMessages, userMsg, aiMsg];

    const [updated] = await db
      .update(conversationsTable)
      .set({
        messages: updatedMessages,
        extractedData: newData,
        currentState: newState,
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
