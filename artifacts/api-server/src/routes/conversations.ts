import { Router, type IRouter } from "express";
import { db, conversationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateConversationBody,
  GetConversationParams,
  SendMessageParams,
  SendMessageBody,
  GetConversationResponse,
  ListConversationsResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { getChatModel } from "../services/ai/client";
import { isOffTopic, OFF_TOPIC_RESPONSE_AR } from "../services/ai/guardrails";
import { buildSystemPrompt } from "../services/ai/context-builder";
import { extractBuyerCriteria, extractSellerData } from "../services/ai/extraction";
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

  const [conversation] = await db
    .insert(conversationsTable)
    .values({
      userId: req.user!.userId,
      propertyId: propertyId ?? null,
      type,
      messages: [greetingMsg],
      extractedData: {},
      currentState: "type_collection",
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
      const model = getChatModel();
      const history = existingMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({
        history,
        systemInstruction: systemPrompt,
      });

      const result = await chat.sendMessage(userText);
      aiText = result.response.text().trim();
    } catch (err) {
      req.log.error({ err }, "Gemini call failed");
      aiText = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.";
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

export default router;
