import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  ListNotificationsResponse,
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";

const router: IRouter = Router();

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.userId))
    .orderBy(notificationsTable.createdAt);

  res.json(ListNotificationsResponse.parse(rows));
});

router.post(
  "/notifications/:id/read",
  authenticate,
  async (req, res): Promise<void> => {
    const parsed = MarkNotificationReadParams.safeParse({
      id: paramStr(req.params.id),
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [notification] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, parsed.data.id),
          eq(notificationsTable.userId, req.user!.userId),
        ),
      );

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    if (notification.readAt) {
      res.sendStatus(204);
      return;
    }

    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(eq(notificationsTable.id, notification.id));

    res.sendStatus(204);
  },
);

export default router;
