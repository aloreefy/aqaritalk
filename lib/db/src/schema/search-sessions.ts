import {
  pgTable,
  uuid,
  numeric,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { conversationsTable } from "./conversations";

export const searchSessionsTable = pgTable("search_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  conversationId: uuid("conversation_id").references(
    () => conversationsTable.id,
  ),
  criteria: jsonb("criteria").notNull().default({}),
  mapLat: numeric("map_lat", { precision: 10, scale: 7 }),
  mapLng: numeric("map_lng", { precision: 10, scale: 7 }),
  radiusKm: numeric("radius_km", { precision: 6, scale: 2 }),
  resultCount: integer("result_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSearchSessionSchema = createInsertSchema(
  searchSessionsTable,
).omit({ id: true, createdAt: true });
export type InsertSearchSession = z.infer<typeof insertSearchSessionSchema>;
export type SearchSession = typeof searchSessionsTable.$inferSelect;
