import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const propertyTypeEnum = pgEnum("property_type", [
  "apartment",
  "house",
  "floor",
  "building",
  "villa",
  "palace",
  "roof",
  "studio",
  "room",
  "office",
  "shop",
  "warehouse",
  "factory",
  "farm",
  "land_residential",
  "land_commercial",
  "land_agricultural",
  "hotel",
  "hospital",
  "clinic",
  "showroom",
  "mixed",
  "chalet",
  "rest_house",
  "other",
]);

export const listingDirectionEnum = pgEnum("listing_direction", [
  "offering",
  "seeking",
]);

export const transactionModeEnum = pgEnum("transaction_mode", [
  "sale",
  "rent",
  "lease",
]);

export const rentalPeriodEnum = pgEnum("rental_period", [
  "daily",
  "weekly",
  "monthly",
  "annual",
  "seasonal",
]);

export const furnishedStatusEnum = pgEnum("furnished_status", [
  "furnished",
  "semi_furnished",
  "unfurnished",
]);

export const propertyConditionEnum = pgEnum("property_condition", [
  "new",
  "excellent",
  "good",
  "needs_renovation",
]);

export const locationAccuracyEnum = pgEnum("location_accuracy", [
  "exact",
  "approximate",
  "district_level",
]);

export const contactPreferenceEnum = pgEnum("contact_preference", [
  "phone",
  "whatsapp",
  "in_app_only",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "draft",
  "pending_review",
  "active",
  "sold",
  "rented",
  "expired",
  "rejected",
  "deleted",
]);

export const pricePerEnum = pgEnum("price_per", [
  "total",
  "per_sqm",
  "per_month",
  "per_week",
  "per_day",
]);

export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  listingName: varchar("listing_name", { length: 200 }),
  listingDirection: listingDirectionEnum("listing_direction")
    .notNull()
    .default("offering"),
  propertyType: propertyTypeEnum("property_type").notNull(),
  transactionMode: transactionModeEnum("transaction_mode").notNull(),
  rentalPeriod: rentalPeriodEnum("rental_period"),
  price: numeric("price", { precision: 14, scale: 2 }),
  priceCurrency: varchar("price_currency", { length: 3 }).notNull().default("JOD"),
  priceNegotiable: boolean("price_negotiable").notNull().default(true),
  pricePer: pricePerEnum("price_per").notNull().default("total"),
  country: varchar("country", { length: 3 }).default("JO"),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  street: varchar("street", { length: 200 }),
  addressFull: text("address_full"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  locationAccuracy: locationAccuracyEnum("location_accuracy").default("approximate"),
  areaSqm: numeric("area_sqm", { precision: 10, scale: 2 }),
  landAreaSqm: numeric("land_area_sqm", { precision: 10, scale: 2 }),
  streetWidthM: numeric("street_width_m", { precision: 6, scale: 2 }),
  rooms: integer("rooms"),
  bathrooms: integer("bathrooms"),
  livingRooms: integer("living_rooms"),
  kitchens: integer("kitchens"),
  floorNumber: integer("floor_number"),
  floorsInBuilding: integer("floors_in_building"),
  furnishedStatus: furnishedStatusEnum("furnished_status"),
  parking: boolean("parking"),
  parkingCount: integer("parking_count"),
  hasElevator: boolean("has_elevator"),
  hasGarden: boolean("has_garden"),
  hasPool: boolean("has_pool"),
  hasBasement: boolean("has_basement"),
  hasRooftopAccess: boolean("has_rooftop_access"),
  hasDriversRoom: boolean("has_drivers_room"),
  buildingAgeYears: integer("building_age_years"),
  condition: propertyConditionEnum("condition"),
  viewType: varchar("view_type", { length: 50 }),
  heatingType: varchar("heating_type", { length: 50 }),
  coolingType: varchar("cooling_type", { length: 50 }),
  ownershipType: varchar("ownership_type", { length: 50 }),
  ownershipShare: numeric("ownership_share", { precision: 5, scale: 4 }),
  description: text("description"),
  status: propertyStatusEnum("status").notNull().default("draft"),
  verified: boolean("verified").notNull().default(false),
  aiGuidanceStep: varchar("ai_guidance_step", { length: 50 }),
  aiMissingFields: text("ai_missing_fields").array(),
  listingExpiresAt: timestamp("listing_expires_at"),
  contactPreference: contactPreferenceEnum("contact_preference").default("whatsapp"),
  brokerListing: boolean("broker_listing").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
