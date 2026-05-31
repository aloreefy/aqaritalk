import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { propertiesTable } from "./properties";

export const contactReleaseStatusEnum = pgEnum("contact_release_status", [
  "pending",
  "buyer_acked",
  "seller_acked",
  "released",
  "expired",
]);

export const contactReleaseTable = pgTable("contact_release", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => usersTable.id),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => propertiesTable.id),
  status: contactReleaseStatusEnum("status").notNull().default("pending"),
  commissionBuyerPct: numeric("commission_buyer_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  commissionSellerPct: numeric("commission_seller_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  buyerAckAt: timestamp("buyer_ack_at"),
  sellerAckAt: timestamp("seller_ack_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContactReleaseSchema = createInsertSchema(
  contactReleaseTable,
).omit({ id: true, createdAt: true });
export type InsertContactRelease = z.infer<typeof insertContactReleaseSchema>;
export type ContactRelease = typeof contactReleaseTable.$inferSelect;
