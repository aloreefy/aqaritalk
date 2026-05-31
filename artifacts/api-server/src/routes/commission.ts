import { Router, type IRouter } from "express";
import { db, commissionSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetCommissionSettingsResponse,
  UpdateCommissionSettingsBody,
  UpdateCommissionSettingsResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { toApiCommission } from "../lib/property-mapper";

const router: IRouter = Router();

async function ensureSettings() {
  const existing = await db.select().from(commissionSettingsTable).limit(1);
  if (existing.length > 0) return existing[0];

  const [row] = await db
    .insert(commissionSettingsTable)
    .values({ defaultBuyerPct: "2.50", defaultSellerPct: "2.50", negotiable: true })
    .returning();
  return row;
}

router.get("/commission/settings", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetCommissionSettingsResponse.parse(toApiCommission(settings)));
});

router.put(
  "/commission/settings",
  authenticate,
  authorize("admin"),
  async (req, res): Promise<void> => {
    const parsed = UpdateCommissionSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const settings = await ensureSettings();
    const { defaultBuyerPct, defaultSellerPct, negotiable } = parsed.data;

    const [updated] = await db
      .update(commissionSettingsTable)
      .set({
        defaultBuyerPct: String(defaultBuyerPct),
        defaultSellerPct: String(defaultSellerPct),
        ...(negotiable != null && { negotiable }),
        updatedAt: new Date(),
      })
      .where(eq(commissionSettingsTable.id, settings.id))
      .returning();

    res.json(UpdateCommissionSettingsResponse.parse(toApiCommission(updated)));
  },
);

export default router;
