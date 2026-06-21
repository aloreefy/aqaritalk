import { Router, type IRouter } from "express";
import { db, conversationsTable, propertiesTable, propertyImagesTable, usersTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
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
import { logger } from "../lib/logger";
import type { SellerData } from "../services/ai/state-machine";
import { toApiProperty } from "../lib/property-mapper";

const router: IRouter = Router();

const AGENT_URL = (process.env.AGENT_URL ?? "http://host.docker.internal:8000").replace(/\/$/, "");
const AGENT_MODEL = process.env.AGENT_MODEL ?? "gemma-4-E2B-it-Q4_K_M.gguf";
const AGENT_HISTORY_TURNS = 8;
const AGENT_MAX_STEPS = 5;
const SHADDA = "\u0651";

type Message = { role: "user" | "assistant"; content: string; timestamp: string };
type Turn = { role: "user" | "assistant"; content: string };

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

const GREETING: Record<string, string> = {
  buyer_search: "مرحباً! أنا مساعدك العقاري في AqariTalk. أخبرني، ما نوع العقار الذي تبحث عنه؟ 🏠",
  seller_listing: "مرحباً! سأساعدك في تسجيل عقارك بأفضل طريقة ممكنة. ما نوع العقار الذي تريد إدراجه؟ 🔑",
};

// ---------------------------------------------------------------------------
// System prompt (mirrors agent.py's build_system_prompt)
// ---------------------------------------------------------------------------

function buildSystemPrompt(): string {
  return [
    "أنت وكيل عقاري ذكي تساعد المستخدمين في البحث عن العقارات وإضافتها.",
    "تحدث دائماً بالعربية بأسلوب ودود ومختصر.",
    "",
    "لديك الأدوات التالية:",
    "- search_properties: ابحث عن العقارات المتاحة (النشطة) المطابقة لمعايير المشتري.",
    "    • city: اسم المدينة بالعربية مثل: عمّان، إربد (اختياري)",
    "    • property_type: apartment, villa, house, studio, land_residential, office, shop ... (اختياري)",
    "    • transaction_mode: sale أو rent أو lease (اختياري)",
    "    • min_price: أقل سعر بالدينار (اختياري)",
    "    • max_price: أعلى سعر / الميزانية بالدينار (اختياري)",
    "    • min_rooms: أقل عدد غرف نوم (اختياري)",
    "    • limit: عدد النتائج المطلوبة (افتراضي 5)",
    "- create_listing: أنشئ إعلان عقار جديد. الحقول property_type و transaction_mode و city و price مطلوبة.",
    "    • property_type: نوع العقار (مطلوب): apartment, villa, studio ...",
    "    • transaction_mode: sale أو rent أو lease (مطلوب)",
    "    • city: المدينة (مطلوب)",
    "    • price: السعر بالدينار (مطلوب)",
    "    • district: الحي أو المنطقة (اختياري)",
    "    • rooms: عدد الغرف (اختياري)",
    "    • area_sqm: المساحة بالمتر المربع (اختياري)",
    "    • description: وصف نصي للعقار (اختياري)",
    "",
    "قواعد إلزامية لإنشاء الإعلانات (create_listing):",
    "- لا تستدعِ create_listing إطلاقاً قبل أن يعطيك المستخدم صراحةً: نوع العقار، نوع الصفقة، المدينة، والسعر.",
    "- ممنوع منعاً باتاً اختراع السعر أو أي حقل آخر. إذا نقص أي حقل مطلوب، اسأل عنه عبر reply.",
    "- اسأل عن الحقول الناقصة واحداً تلو الآخر بأسلوب ودود ومختصر.",
    "",
    'في كل خطوة أخرج كائن JSON واحداً فقط بهذا الشكل:',
    '{"action": "<اسم الأداة أو reply>", "arguments": { ... }}',
    "- لاستدعاء أداة: ضع اسمها في action ومعاملاتها في arguments.",
    '- للرد على المستخدم: {"action": "reply", "arguments": {"text": "ردك بالعربية"}}',
    "لا تُخرج أي نص خارج كائن JSON.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Message builder — Gemma has no system role; fold it into the first user turn
// ---------------------------------------------------------------------------

function buildTurns(systemPrompt: string, history: Turn[], userMessage: string): Turn[] {
  let turns = [...history];
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();

  if (turns.length > 0) {
    const [first, ...rest] = turns;
    return [
      { role: "user", content: systemPrompt + "\n\nرسالة المستخدم: " + first.content },
      ...rest,
      { role: "user", content: userMessage },
    ];
  }
  return [{ role: "user", content: systemPrompt + "\n\nرسالة المستخدم: " + userMessage }];
}

// ---------------------------------------------------------------------------
// Tool execution — runs inside Node, queries DB directly
// ---------------------------------------------------------------------------

async function runTool(action: string, args: Record<string, unknown>): Promise<unknown> {
  if (action === "search_properties") {
    const { city, property_type, transaction_mode, min_price, max_price, min_rooms, limit = 5 } = args;
    const cap = Math.max(1, Math.min(Number(limit) || 5, 20));
    const conditions = [isNull(propertiesTable.deletedAt), eq(propertiesTable.status, "active")];

    if (city) {
      const stripped = String(city).replace(new RegExp(SHADDA, "g"), "");
      conditions.push(sql`REPLACE(${propertiesTable.city}, ${SHADDA}, '') ILIKE ${"%" + stripped + "%"}`);
    }
    if (property_type) conditions.push(sql`${propertiesTable.propertyType} = ${String(property_type)}`);
    if (transaction_mode) conditions.push(sql`${propertiesTable.transactionMode} = ${String(transaction_mode)}`);
    if (min_price != null) conditions.push(sql`${propertiesTable.price}::numeric >= ${Number(min_price)}`);
    if (max_price != null) conditions.push(sql`${propertiesTable.price}::numeric <= ${Number(max_price)}`);
    if (min_rooms != null) conditions.push(eq(propertiesTable.rooms, Number(min_rooms)));

    const rows = await db
      .select({
        id: propertiesTable.id,
        listing_name: propertiesTable.listingName,
        property_type: propertiesTable.propertyType,
        transaction_mode: propertiesTable.transactionMode,
        city: propertiesTable.city,
        district: propertiesTable.district,
        price: propertiesTable.price,
        price_currency: propertiesTable.priceCurrency,
        rooms: propertiesTable.rooms,
        bathrooms: propertiesTable.bathrooms,
        area_sqm: propertiesTable.areaSqm,
        description: propertiesTable.description,
      })
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(sql`${propertiesTable.price}::numeric asc nulls last`)
      .limit(cap);

    const results = rows.map((r) => ({
      ...r,
      id: String(r.id),
      price: r.price != null ? parseFloat(r.price) : null,
      area_sqm: r.area_sqm != null ? parseFloat(r.area_sqm) : null,
      description: r.description ? r.description.slice(0, 160) : null,
    }));
    return { count: results.length, results };
  }

  if (action === "create_listing") {
    const { property_type, transaction_mode, city, price, district, rooms, area_sqm, description } = args;
    if (!property_type || !transaction_mode || !city || price == null) {
      return { error: "property_type, transaction_mode, city, price are required" };
    }
    const [owner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`${usersTable.role} IN ('broker', 'seller')`)
      .limit(1);

    if (!owner) return { error: "لا يوجد مستخدم لإسناد الإعلان إليه." };

    const insertValues: Record<string, unknown> = {
      createdBy: owner.id,
      listingName: `${property_type} - ${city}`,
      listingDirection: "offering",
      propertyType: property_type,
      transactionMode: transaction_mode,
      city,
      status: "pending_review",
      price: String(price),
    };
    if (district != null) insertValues.district = district;
    if (rooms != null) insertValues.rooms = Number(rooms);
    if (area_sqm != null) insertValues.areaSqm = String(area_sqm);
    if (description != null) insertValues.description = description;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [property] = await db.insert(propertiesTable).values(insertValues as any).returning({ id: propertiesTable.id });
    return { id: String(property.id), status: "pending_review", message: "تم إنشاء الإعلان بنجاح وهو الآن قيد المراجعة." };
  }

  return { error: `أداة غير معروفة: ${action}` };
}

// ---------------------------------------------------------------------------
// Agent loop — calls llama.cpp /v1/chat/completions, handles tool calls
// ---------------------------------------------------------------------------

async function runAgentLoop(userMessage: string, history: Turn[], signal: AbortSignal): Promise<string> {
  const systemPrompt = buildSystemPrompt();
  const messages = buildTurns(systemPrompt, history, userMessage);

  for (let step = 0; step < AGENT_MAX_STEPS; step++) {
    const resp = await fetch(`${AGENT_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2048,
      }),
      signal,
    });

    if (!resp.ok) throw new Error(`llama.cpp HTTP ${resp.status}`);

    // Gemma 4 runs in thinking mode: actual JSON lands in `content`,
    // chain-of-thought in `reasoning_content`. If content is empty the model
    // exhausted its token budget mid-thought — treat as a transient error.
    const data = await resp.json() as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>;
    };
    const choice = data.choices?.[0];
    const content = (choice?.message?.content ?? "").trim();

    if (!content) {
      logger.warn({ finish_reason: choice?.finish_reason }, "llama.cpp returned empty content");
      return "عذراً، انتهى الوقت المخصص للتفكير. أعد المحاولة من فضلك.";
    }

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(content);
    } catch {
      return content || "أعد المحاولة من فضلك.";
    }

    if (!obj || typeof obj !== "object") return content;

    const action = String(obj.action ?? "");
    let args = obj.arguments ?? {};
    if (typeof args !== "object" || Array.isArray(args)) {
      args = typeof args === "string" ? { text: args } : {};
    }
    const argsObj = args as Record<string, unknown>;

    if (action === "reply") {
      return String(argsObj.text ?? obj.text ?? obj.reply ?? "").trim() || "أعد المحاولة من فضلك.";
    }

    if (action === "search_properties" || action === "create_listing") {
      const toolResult = await runTool(action, argsObj);
      messages.push({ role: "assistant", content });
      messages.push({ role: "user", content: "نتيجة الأداة (JSON):\n" + JSON.stringify(toolResult, null, 0) });
      continue;
    }

    // Unknown action — treat as plain text reply
    return content || "أعد المحاولة من فضلك.";
  }

  return "عذراً، لم أتمكن من إكمال طلبك.";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

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
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { type, propertyId, market } = parsed.data;
  const greetingMsg: Message = { role: "assistant", content: GREETING[type] ?? "مرحباً!", timestamp: new Date().toISOString() };
  const initialState = type === "seller_listing" ? "greeting" : "type_collection";

  const [conversation] = await db.insert(conversationsTable).values({
    userId: req.user!.userId,
    propertyId: propertyId ?? null,
    type,
    messages: [greetingMsg],
    extractedData: {},
    currentState: initialState,
    status: "active",
    market: market ?? "JO",
  }).returning();

  res.status(201).json(GetConversationResponse.parse(conversation));
});

router.get("/conversations/:id", authenticate, async (req, res): Promise<void> => {
  const parsed = GetConversationParams.safeParse({ id: paramStr(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [convo] = await db.select().from(conversationsTable).where(
    and(eq(conversationsTable.id, parsed.data.id), eq(conversationsTable.userId, req.user!.userId)),
  );
  if (!convo) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(GetConversationResponse.parse(convo));
});

router.post("/conversations/:id/messages", authenticate, async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const [convo] = await db.select().from(conversationsTable).where(
    and(eq(conversationsTable.id, params.data.id), eq(conversationsTable.userId, req.user!.userId)),
  );
  if (!convo) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (convo.status !== "active") { res.status(409).json({ error: "Conversation is no longer active" }); return; }

  const userText = body.data.content;

  // Guardrail
  if (isOffTopic(userText)) {
    const offTopicMsg: Message = { role: "assistant", content: OFF_TOPIC_RESPONSE_AR, timestamp: new Date().toISOString() };
    const existingMsgs = (convo.messages as Message[]) ?? [];
    const userMsg: Message = { role: "user", content: userText, timestamp: new Date().toISOString() };
    const updatedMessages = [...existingMsgs, userMsg, offTopicMsg];
    const [updated] = await db.update(conversationsTable).set({ messages: updatedMessages, updatedAt: new Date() }).where(eq(conversationsTable.id, convo.id)).returning();
    res.json({ message: offTopicMsg, conversation: GetConversationResponse.parse(updated) });
    return;
  }

  const existingMessages = (convo.messages as Message[]) ?? [];
  const history: Turn[] = existingMessages.slice(-AGENT_HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content }));
  const userMsg: Message = { role: "user", content: userText, timestamp: new Date().toISOString() };

  // Agent loop — 180s total timeout
  let aiText = "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    aiText = await runAgentLoop(userText, history, controller.signal);
  } catch (err) {
    req.log.error({ err }, "Agent loop failed");
    aiText = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.";
  } finally {
    clearTimeout(timer);
  }

  const aiMsg: Message = { role: "assistant", content: aiText, timestamp: new Date().toISOString() };
  const updatedMessages = [...existingMessages, userMsg, aiMsg];

  const [updated] = await db.update(conversationsTable).set({ messages: updatedMessages, updatedAt: new Date() }).where(eq(conversationsTable.id, convo.id)).returning();
  res.json({ message: aiMsg, conversation: GetConversationResponse.parse(updated) });
});

// Submit listing
router.post("/conversations/:id/submit-listing", authenticate, async (req, res): Promise<void> => {
  const id = paramStr(req.params.id);
  const [convo] = await db.select().from(conversationsTable).where(
    and(eq(conversationsTable.id, id), eq(conversationsTable.userId, req.user!.userId)),
  );
  if (!convo) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (convo.type !== "seller_listing") { res.status(400).json({ error: "Only seller_listing conversations can submit a listing" }); return; }
  if (convo.currentState !== "submit_ready" && convo.currentState !== "guidance_review") {
    res.status(400).json({ error: "Listing is not ready for submission yet" }); return;
  }

  const data = (convo.extractedData ?? {}) as SellerData;

  if (convo.propertyId) {
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, convo.propertyId));
    if (existing) {
      const existingImages = await db.select().from(propertyImagesTable).where(eq(propertyImagesTable.propertyId, existing.id));
      res.json(GetPropertyResponse.parse(toApiProperty(existing, existingImages)));
      return;
    }
  }

  if (!data.category || !data.transactionMode) { res.status(400).json({ error: "Property type and transaction mode are required" }); return; }

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
    const furnishedMap: Record<string, string> = { furnished: "furnished", مفروش: "furnished", "semi-furnished": "semi_furnished", "نصف مفروش": "semi_furnished", unfurnished: "unfurnished", "غير مفروش": "unfurnished" };
    insertValues.furnishedStatus = furnishedMap[data.furnished] ?? "unfurnished";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [property] = await db.insert(propertiesTable).values(insertValues as any).returning();
  await db.update(conversationsTable).set({ propertyId: property.id, status: "completed", currentState: "submit_ready", updatedAt: new Date() }).where(eq(conversationsTable.id, convo.id));
  req.log.info({ propertyId: property.id, conversationId: convo.id }, "Listing submitted from conversation");
  res.status(201).json(GetPropertyResponse.parse(property));
});

export default router;
