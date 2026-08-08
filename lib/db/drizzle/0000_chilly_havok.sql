CREATE TYPE "public"."user_language" AS ENUM('ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."user_market" AS ENUM('JO', 'SA', 'AE', 'EG', 'KW', 'QA', 'BH', 'OM', 'MA', 'LB', 'IQ');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('buyer', 'seller', 'broker', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_verification_status" AS ENUM('unverified', 'verified');--> statement-breakpoint
CREATE TYPE "public"."contact_preference" AS ENUM('phone', 'whatsapp', 'in_app_only');--> statement-breakpoint
CREATE TYPE "public"."furnished_status" AS ENUM('furnished', 'semi_furnished', 'unfurnished');--> statement-breakpoint
CREATE TYPE "public"."listing_direction" AS ENUM('offering', 'seeking');--> statement-breakpoint
CREATE TYPE "public"."location_accuracy" AS ENUM('exact', 'approximate', 'district_level');--> statement-breakpoint
CREATE TYPE "public"."price_per" AS ENUM('total', 'per_sqm', 'per_month', 'per_week', 'per_day');--> statement-breakpoint
CREATE TYPE "public"."property_condition" AS ENUM('new', 'excellent', 'good', 'needs_renovation');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('draft', 'pending_review', 'active', 'sold', 'rented', 'expired', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'floor', 'building', 'villa', 'palace', 'roof', 'studio', 'room', 'office', 'shop', 'warehouse', 'factory', 'farm', 'land_residential', 'land_commercial', 'land_agricultural', 'hotel', 'hospital', 'clinic', 'showroom', 'mixed', 'chalet', 'rest_house', 'other');--> statement-breakpoint
CREATE TYPE "public"."rental_period" AS ENUM('daily', 'weekly', 'monthly', 'annual', 'seasonal');--> statement-breakpoint
CREATE TYPE "public"."transaction_mode" AS ENUM('sale', 'rent', 'lease');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('buyer_search', 'seller_listing');--> statement-breakpoint
CREATE TYPE "public"."contact_release_status" AS ENUM('pending', 'buyer_acked', 'seller_acked', 'released', 'expired');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(100),
	"role" "user_role" DEFAULT 'buyer' NOT NULL,
	"market" "user_market" DEFAULT 'JO' NOT NULL,
	"language" "user_language" DEFAULT 'ar' NOT NULL,
	"verification_status" "user_verification_status" DEFAULT 'unverified' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"auto_send_voice" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"listing_name" varchar(200),
	"listing_direction" "listing_direction" DEFAULT 'offering' NOT NULL,
	"property_type" "property_type" NOT NULL,
	"transaction_mode" "transaction_mode" NOT NULL,
	"rental_period" "rental_period",
	"price" numeric(14, 2),
	"price_currency" varchar(3) DEFAULT 'JOD' NOT NULL,
	"price_negotiable" boolean DEFAULT true NOT NULL,
	"price_per" "price_per" DEFAULT 'total' NOT NULL,
	"country" varchar(3) DEFAULT 'JO',
	"city" varchar(100),
	"district" varchar(100),
	"street" varchar(200),
	"address_full" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"location_accuracy" "location_accuracy" DEFAULT 'approximate',
	"area_sqm" numeric(10, 2),
	"land_area_sqm" numeric(10, 2),
	"street_width_m" numeric(6, 2),
	"rooms" integer,
	"bathrooms" integer,
	"living_rooms" integer,
	"kitchens" integer,
	"floor_number" integer,
	"floors_in_building" integer,
	"furnished_status" "furnished_status",
	"parking" boolean,
	"parking_count" integer,
	"has_elevator" boolean,
	"has_garden" boolean,
	"has_pool" boolean,
	"has_basement" boolean,
	"has_rooftop_access" boolean,
	"has_drivers_room" boolean,
	"building_age_years" integer,
	"condition" "property_condition",
	"view_type" varchar(50),
	"heating_type" varchar(50),
	"cooling_type" varchar(50),
	"ownership_type" varchar(50),
	"ownership_share" numeric(5, 4),
	"description" text,
	"status" "property_status" DEFAULT 'draft' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"ai_guidance_step" varchar(50),
	"ai_missing_fields" text[],
	"listing_expires_at" timestamp,
	"contact_preference" "contact_preference" DEFAULT 'whatsapp',
	"broker_listing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"path" varchar(500) NOT NULL,
	"gps_lat" numeric(10, 7),
	"gps_lng" numeric(10, 7),
	"size_bytes" integer,
	"is_voice_note" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"property_id" uuid,
	"type" "conversation_type" NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_state" text DEFAULT 'greeting' NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"market" text DEFAULT 'JO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"conversation_id" uuid,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"map_lat" numeric(10, 7),
	"map_lng" numeric(10, 7),
	"radius_km" numeric(6, 2),
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_release" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"status" "contact_release_status" DEFAULT 'pending' NOT NULL,
	"commission_buyer_pct" numeric(5, 2) NOT NULL,
	"commission_seller_pct" numeric(5, 2) NOT NULL,
	"buyer_ack_at" timestamp,
	"seller_ack_at" timestamp,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"default_buyer_pct" numeric(5, 2) DEFAULT '2.50' NOT NULL,
	"default_seller_pct" numeric(5, 2) DEFAULT '2.50' NOT NULL,
	"negotiable" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" jsonb,
	"ip" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title_ar" varchar(200) NOT NULL,
	"title_en" varchar(200) NOT NULL,
	"body_ar" text NOT NULL,
	"body_en" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"otp_expiry_minutes" integer DEFAULT 10 NOT NULL,
	"otp_max_attempts" integer DEFAULT 5 NOT NULL,
	"otp_rate_limit_count" integer DEFAULT 3 NOT NULL,
	"otp_rate_limit_window_minutes" integer DEFAULT 15 NOT NULL,
	"ai_model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"ai_temperature" numeric(3, 2) DEFAULT '0.30' NOT NULL,
	"ai_max_turns" integer DEFAULT 5 NOT NULL,
	"ai_guardrail_level" text DEFAULT 'balanced' NOT NULL,
	"default_language" text DEFAULT 'ar' NOT NULL,
	"default_currency" text DEFAULT 'JOD' NOT NULL,
	"max_images_per_property" integer DEFAULT 20 NOT NULL,
	"auto_approve_listings" boolean DEFAULT false NOT NULL,
	"listing_expiry_days" integer DEFAULT 90 NOT NULL,
	"voice_cta_style" text DEFAULT 'green_card' NOT NULL,
	"map_provider" text DEFAULT 'osm' NOT NULL,
	"mapbox_api_key" text,
	"google_maps_api_key" text,
	"otp_provider" text DEFAULT 'console' NOT NULL,
	"twilio_account_sid" text,
	"twilio_auth_token" text,
	"twilio_from_number" text,
	"unifonic_app_sid" text,
	"unifonic_sender" text,
	"msegat_api_key" text,
	"msegat_sender" text,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"feature_voice_input" boolean DEFAULT true NOT NULL,
	"feature_map_view" boolean DEFAULT true NOT NULL,
	"feature_contact_release" boolean DEFAULT true NOT NULL,
	"feature_seller_wizard" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_release" ADD CONSTRAINT "contact_release_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_release" ADD CONSTRAINT "contact_release_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_release" ADD CONSTRAINT "contact_release_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;