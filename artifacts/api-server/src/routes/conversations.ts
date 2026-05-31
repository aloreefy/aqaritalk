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

const router: IRouter = Router();

type Message = { role: "user" | "assistant"; content: string; timestamp: string };

const GREETING: Record<string, Record<string, string>> = {
  buyer_search: {
    ar: "مرحباً! أنا مساعدك العقاري. أخبرني، ما نوع العقار الذي تبحث عنه؟ 🏠",
    en: "Hello! I'm your real estate assistant. What type of property are you looking for? 🏠",
  },
  seller_listing: {
    ar: "مرحباً! سأساعدك في تسجيل عقارك. ما نوع العقار الذي تريد إدراجه؟ 🔑",
    en: "Hello! I'll help you list your property. What type of property would you like to list? 🔑",
  },
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

  const { type, propertyId } = parsed.data;

  const greeting = GREETING[type]?.ar ?? "مرحباً!";
  const greetingMsg: Message = {
    role: "assistant",
    content: greeting,
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
      currentState: "greeting",
      status: "active",
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

    const userMsg: Message = {
      role: "user",
      content: body.data.content,
      timestamp: new Date().toISOString(),
    };

    const aiMsg: Message = {
      role: "assistant",
      content:
        "شكراً على ردك. سأعالج طلبك قريباً. (AI integration coming in next phase)",
      timestamp: new Date().toISOString(),
    };

    const existingMessages = (convo.messages as Message[]) ?? [];
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

export default router;
