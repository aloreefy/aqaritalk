import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { propertiesTable } from "./properties";

export const propertyImagesTable = pgTable("property_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => propertiesTable.id),
  path: varchar("path", { length: 500 }).notNull(),
  gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
  sizeBytes: integer("size_bytes"),
  isVoiceNote: boolean("is_voice_note").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPropertyImageSchema = createInsertSchema(
  propertyImagesTable,
).omit({ id: true, createdAt: true });
export type InsertPropertyImage = z.infer<typeof insertPropertyImageSchema>;
export type PropertyImage = typeof propertyImagesTable.$inferSelect;
