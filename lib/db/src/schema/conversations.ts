import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { propertiesTable } from "./properties";

export const conversationTypeEnum = pgEnum("conversation_type", [
  "buyer_search",
  "seller_listing",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "completed",
  "abandoned",
]);

export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  propertyId: uuid("property_id").references(() => propertiesTable.id),
  type: conversationTypeEnum("type").notNull(),
  messages: jsonb("messages").notNull().default([]),
  extractedData: jsonb("extracted_data").notNull().default({}),
  currentState: text("current_state").notNull().default("greeting"),
  status: conversationStatusEnum("status").notNull().default("active"),
  market: text("market").notNull().default("JO"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
