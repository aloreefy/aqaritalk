import { pgTable, uuid, integer, boolean, numeric, text, timestamp } from "drizzle-orm/pg-core";

export const systemSettingsTable = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── OTP & Auth ────────────────────────────────────────
  otpExpiryMinutes: integer("otp_expiry_minutes").notNull().default(10),
  otpMaxAttempts: integer("otp_max_attempts").notNull().default(5),
  otpRateLimitCount: integer("otp_rate_limit_count").notNull().default(3),
  otpRateLimitWindowMinutes: integer("otp_rate_limit_window_minutes").notNull().default(15),

  // ── AI Broker ─────────────────────────────────────────
  aiModel: text("ai_model").notNull().default("gpt-4o-mini"),
  aiTemperature: numeric("ai_temperature", { precision: 3, scale: 2 }).notNull().default("0.30"),
  aiMaxTurns: integer("ai_max_turns").notNull().default(5),
  aiGuardrailLevel: text("ai_guardrail_level").notNull().default("balanced"),

  // ── Market & Localization ─────────────────────────────
  defaultLanguage: text("default_language").notNull().default("ar"),
  defaultCurrency: text("default_currency").notNull().default("JOD"),

  // ── Property Listings ─────────────────────────────────
  maxImagesPerProperty: integer("max_images_per_property").notNull().default(20),
  autoApproveListings: boolean("auto_approve_listings").notNull().default(false),
  listingExpiryDays: integer("listing_expiry_days").notNull().default(90),

  // ── Appearance ────────────────────────────────────────
  voiceCtaStyle: text("voice_cta_style").notNull().default("green_card"),

  // ── System & Feature Flags ────────────────────────────
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  featureVoiceInput: boolean("feature_voice_input").notNull().default(true),
  featureMapView: boolean("feature_map_view").notNull().default(true),
  featureContactRelease: boolean("feature_contact_release").notNull().default(true),
  featureSellerWizard: boolean("feature_seller_wizard").notNull().default(true),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SystemSettings = typeof systemSettingsTable.$inferSelect;
