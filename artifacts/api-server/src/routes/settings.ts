import { Router, type IRouter } from "express";
import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router: IRouter = Router();
const adminGuard = [authenticate, authorize("admin")];

/** Ensure exactly one settings row exists, return it. */
async function getOrCreateSettings() {
  const rows = await db.select().from(systemSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(systemSettingsTable).values({}).returning();
  return created;
}

function toResponse(row: typeof systemSettingsTable.$inferSelect) {
  return {
    ...row,
    aiTemperature: Number(row.aiTemperature),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/admin/settings", ...adminGuard, async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(toResponse(settings));
});

router.put("/admin/settings", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await getOrCreateSettings();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const [updated] = await db
    .update(systemSettingsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(systemSettingsTable.id, current.id))
    .returning();

  res.json(UpdateAdminSettingsResponse.parse(toResponse(updated)));
});

export default router;
