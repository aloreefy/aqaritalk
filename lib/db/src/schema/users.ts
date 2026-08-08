import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", [
  "buyer",
  "seller",
  "broker",
  "admin",
]);

export const userMarketEnum = pgEnum("user_market", [
  "JO",
  "SA",
  "AE",
  "EG",
  "KW",
  "QA",
  "BH",
  "OM",
  "MA",
  "LB",
  "IQ",
]);

export const userLanguageEnum = pgEnum("user_language", ["ar", "en"]);

export const userVerificationStatusEnum = pgEnum("user_verification_status", [
  "unverified",
  "verified",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "restricted",
  "suspended",
  "banned",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  role: userRoleEnum("role").notNull().default("buyer"),
  market: userMarketEnum("market").notNull().default("JO"),
  language: userLanguageEnum("language").notNull().default("ar"),
  verificationStatus: userVerificationStatusEnum("verification_status")
    .notNull()
    .default("unverified"),
  status: userStatusEnum("status").notNull().default("active"),
  username: varchar("username", { length: 100 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  preferredCurrency: varchar("preferred_currency", { length: 10 }),
  autoSendVoice: boolean("auto_send_voice").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
