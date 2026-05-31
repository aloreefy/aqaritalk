import { pgTable, uuid, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commissionSettingsTable = pgTable("commission_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  defaultBuyerPct: numeric("default_buyer_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("2.50"),
  defaultSellerPct: numeric("default_seller_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("2.50"),
  negotiable: boolean("negotiable").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommissionSettingsSchema = createInsertSchema(
  commissionSettingsTable,
).omit({ id: true, updatedAt: true });
export type InsertCommissionSettings = z.infer<
  typeof insertCommissionSettingsSchema
>;
export type CommissionSettings = typeof commissionSettingsTable.$inferSelect;
