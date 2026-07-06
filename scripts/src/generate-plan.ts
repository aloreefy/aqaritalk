import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  convertInchesToTwip,
} from "docx";
import { writeFileSync } from "fs";

const BRAND = "#1B4F72";
const ACCENT = "#2980B9";
const LIGHT = "#D6EAF8";

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    run: { color: BRAND, bold: true },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    run: { color: ACCENT, bold: true },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    run: { bold: true },
  });
}

function body(text: string, options: { bold?: boolean; italic?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italic,
        size: 22,
      }),
    ],
    spacing: { after: 100 },
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function note(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: "555555", size: 20 })],
    spacing: { after: 100 },
    indent: { left: convertInchesToTwip(0.3) },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { after: 100 } });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: BRAND, type: ShadingType.CLEAR, color: BRAND },
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
        }),
    ),
  });

  const dataRows = rows.map(
    (row, ri) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 20 })],
                }),
              ],
              shading:
                ri % 2 === 0
                  ? { fill: "F4F9FD", type: ShadingType.CLEAR, color: "F4F9FD" }
                  : undefined,
            }),
        ),
      }),
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1.2),
          },
        },
      },
      children: [
        // ── COVER ──────────────────────────────────────────────────────────────
        spacer(),
        spacer(),
        spacer(),
        new Paragraph({
          children: [new TextRun({ text: "AqariTalk", bold: true, size: 72, color: BRAND })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "AI-Guided Real Estate Platform",
              size: 36,
              color: ACCENT,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Final Build Plan — Version 1.0", size: 24, color: "555555" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "May 2026", size: 22, color: "888888" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Confidential — Internal Planning Document",
              size: 18,
              color: "AAAAAA",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        pageBreak(),

        // ── 1. WHAT IS AQARITALK ───────────────────────────────────────────────
        h1("1. What Is AqariTalk"),
        body(
          "AqariTalk is an AI-guided real estate workflow platform — not a generic chatbot. It is a transactional orchestration system built on four pillars:",
        ),
        bullet("AI-controlled conversations that guide sellers and buyers through structured workflows"),
        bullet("Voice-first interaction: users speak naturally in Arabic or English; the system extracts structured data"),
        bullet("Map-centric property discovery with dynamic geo-filtering"),
        bullet("Trust-enforced contact exchange: phone numbers are only revealed after both parties acknowledge commission terms"),
        spacer(),
        body("The platform is not a social app, not an entertainment platform, and not a free-form AI assistant. Every AI interaction is bounded by real estate business context."),
        spacer(),

        // ── 2. LOCKED DECISIONS ───────────────────────────────────────────────
        h1("2. All Decisions — Locked In"),
        spacer(),
        makeTable(
          ["Topic", "Decision"],
          [
            ["App name", "AqariTalk"],
            ["Primary language", "Arabic (RTL default), English (LTR toggle)"],
            ["Launch markets", "Jordan (JO) and KSA (SA) — then broader MENA"],
            ["Currencies at MVP", "JOD, SAR, USD — stored as currency code, not converted"],
            ["Dialects", "Levantine (JO) and Najdi/Gulf (SA) — injected into AI system prompt via market setting"],
            ["AI model", "Gemini Flash 2.0 — free tier for MVP, cheapest at scale"],
            ["AI client design", "Abstraction layer — model is swappable with no route code changes"],
            ["Map provider", "Mapbox — free 50K loads/month, Arabic locale support, RTL-ready"],
            ["Authentication", "Phone OTP via WhatsApp (primary) + SMS fallback — passwordless"],
            ["OTP provider", "Infobip / Unifonic (MENA-focused) — mocked in dev (logs to console)"],
            ["Audio storage", "No — transcript text only. Two opt-in exceptions (see Section 6)"],
            ["STT method", "Browser Web Speech API (MVP) — OpenAI Whisper as upgrade path"],
            ["TTS / Voice calls", "Post-MVP (Phase 3 of product roadmap)"],
            ["AI completeness", "Behavioral guidance only — no visible score or percentage"],
            ["Contact release", "Dual acknowledgment required before phone numbers revealed"],
            ["Commission model", "Buyer % + Seller %, negotiable, shown before contact release"],
            ["Monetization", "Free buyers, tiered sellers, contact release fee"],
            ["Fine-tuning / LoRA", "Not needed — prompt engineering + structured output handles extraction"],
            ["Voice calls (CPaaS)", "Post-MVP"],
            ["Auto-send setting", "User preference: ON or OFF, default OFF"],
          ],
        ),
        pageBreak(),

        // ── 3. TECH STACK ─────────────────────────────────────────────────────
        h1("3. Technology Stack"),
        spacer(),
        makeTable(
          ["Layer", "Technology", "Notes"],
          [
            ["Frontend framework", "React 19 + Vite + TypeScript", "Already in workspace catalog"],
            ["Styling", "Tailwind CSS v4", "Logical properties for RTL/LTR"],
            ["Routing", "React Router v7", "Mobile-style page transitions"],
            ["Data fetching", "TanStack Query v5", "Generated hooks from OpenAPI codegen"],
            ["Map", "Mapbox GL + react-map-gl", "Arabic locale, custom styling"],
            ["Internationalization", "react-i18next", "Arabic default, English fallback"],
            ["Backend", "Express 5 + TypeScript + Node 24", "Existing api-server artifact"],
            ["Database", "PostgreSQL + Drizzle ORM", "Existing db lib"],
            ["Validation", "Zod v4", "Generated from OpenAPI spec via Orval"],
            ["AI model", "Gemini Flash 2.0", "Via Google AI SDK — free tier for MVP"],
            ["AI client", "Abstraction layer", "Swappable: Gemini → GPT-4o-mini → others"],
            ["Auth", "Phone OTP + JWT (httpOnly cookie)", "Passwordless, 30-day expiry"],
            ["Image processing", "multer + sharp", "WebP conversion, max 1200px, EXIF GPS extraction"],
            ["Geo search", "Haversine formula in SQL", "No PostGIS needed at MVP scale"],
            ["STT", "Browser Web Speech API", "Arabic + English, runs client-side"],
            ["Logging", "pino + pino-http", "req.log in routes, logger singleton elsewhere"],
          ],
        ),
        pageBreak(),

        // ── 4. DATABASE SCHEMA ─────────────────────────────────────────────────
        h1("4. Database Schema"),
        body("All tables use UUID primary keys, and soft delete via deleted_at timestamp where applicable."),
        spacer(),

        h2("4.1 users"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["phone", "varchar UNIQUE", "International format, e.g. +962791234567"],
            ["name", "varchar", ""],
            ["role", "enum", "buyer | seller | broker | admin"],
            ["market", "enum", "JO | SA | AE | EG | ... (user's country)"],
            ["language", "enum", "ar | en — display language preference"],
            ["verification_status", "enum", "unverified | verified"],
            ["status", "enum", "active | suspended"],
            ["auto_send_voice", "boolean", "User preference: auto-send transcript. Default false"],
            ["created_at", "timestamp", ""],
            ["updated_at", "timestamp", ""],
            ["deleted_at", "timestamp nullable", "Soft delete"],
          ],
        ),
        spacer(),

        h2("4.2 properties"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["created_by", "uuid → users", "Seller or broker who created the listing"],
            ["listing_name", "varchar nullable", "Optional friendly title"],
            ["listing_direction", "enum", "offering (عرض) | seeking (طلب)"],
            ["property_type", "enum", "apartment, house, floor, building, villa, palace, roof, studio, room, office, shop, warehouse, factory, farm, land_residential, land_commercial, land_agricultural, hotel, hospital, clinic, showroom, mixed, chalet, rest_house, other"],
            ["transaction_mode", "enum", "sale | rent | lease"],
            ["rental_period", "enum nullable", "daily | weekly | monthly | annual | seasonal"],
            ["price", "numeric", ""],
            ["price_currency", "varchar(3)", "JOD | SAR | AED | USD | ..."],
            ["price_negotiable", "boolean", ""],
            ["price_per", "enum", "total | per_sqm | per_month | per_day | per_week"],
            ["country", "varchar", "ISO code"],
            ["city", "varchar", ""],
            ["district", "varchar", "Neighborhood / حي"],
            ["street", "varchar nullable", ""],
            ["address_full", "text nullable", "Free text as described by seller"],
            ["latitude", "numeric nullable", "GPS coordinate"],
            ["longitude", "numeric nullable", "GPS coordinate"],
            ["location_accuracy", "enum", "exact | approximate | district_level"],
            ["area_sqm", "numeric nullable", "Property built area"],
            ["land_area_sqm", "numeric nullable", "For houses, villas, land plots"],
            ["street_width_m", "numeric nullable", "Relevant for commercial and land"],
            ["rooms", "integer nullable", "Bedrooms"],
            ["bathrooms", "integer nullable", ""],
            ["living_rooms", "integer nullable", ""],
            ["kitchens", "integer nullable", ""],
            ["floor_number", "integer nullable", "For apartments/floors"],
            ["floors_in_building", "integer nullable", "Total floors of the building"],
            ["furnished_status", "enum nullable", "furnished | semi | unfurnished"],
            ["parking", "boolean nullable", ""],
            ["parking_count", "integer nullable", ""],
            ["has_elevator", "boolean nullable", ""],
            ["has_garden", "boolean nullable", ""],
            ["has_pool", "boolean nullable", ""],
            ["has_basement", "boolean nullable", ""],
            ["has_rooftop_access", "boolean nullable", ""],
            ["has_drivers_room", "boolean nullable", "Common in KSA"],
            ["building_age_years", "integer nullable", ""],
            ["condition", "enum nullable", "new | excellent | good | needs_renovation"],
            ["view_type", "varchar nullable", "street | garden | sea | mountain | interior"],
            ["heating_type", "varchar nullable", ""],
            ["cooling_type", "varchar nullable", ""],
            ["ownership_type", "varchar nullable", "tabu | hujjah | shared | lease | other"],
            ["ownership_share", "numeric nullable", "Fraction if shared ownership"],
            ["description", "text nullable", ""],
            ["status", "enum", "draft | pending_review | active | sold | rented | expired | rejected | deleted"],
            ["verified", "boolean", "Admin verified flag"],
            ["ai_guidance_step", "varchar nullable", "Which field the AI last asked about"],
            ["ai_missing_fields", "jsonb nullable", "Array of field names still missing"],
            ["listing_expires_at", "timestamp nullable", "Auto-expiry per tier"],
            ["contact_preference", "enum", "phone | whatsapp | in_app_only"],
            ["broker_listing", "boolean", "True if listed by broker on behalf of owner"],
            ["created_at", "timestamp", ""],
            ["updated_at", "timestamp", ""],
            ["deleted_at", "timestamp nullable", "Soft delete"],
          ],
        ),
        spacer(),

        h2("4.3 property_images"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["property_id", "uuid → properties", ""],
            ["path", "varchar", "Stored file path or object storage URL"],
            ["gps_lat", "numeric nullable", "From image EXIF if available"],
            ["gps_lng", "numeric nullable", ""],
            ["size_bytes", "integer", ""],
            ["is_voice_note", "boolean", "False for images; reserved for audio notes (post-MVP)"],
            ["created_at", "timestamp", ""],
          ],
        ),
        spacer(),

        h2("4.4 conversations"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["user_id", "uuid → users", ""],
            ["property_id", "uuid nullable → properties", "Linked for seller flow"],
            ["type", "enum", "buyer_search | seller_listing"],
            ["market", "varchar", "JO | SA | ... — snapshot of user market at session start"],
            ["messages", "jsonb", "Array of {role, content, timestamp}"],
            ["extracted_data", "jsonb", "Structured fields extracted so far"],
            ["current_state", "varchar", "State machine step name"],
            ["status", "enum", "active | completed | abandoned"],
            ["created_at", "timestamp", ""],
            ["updated_at", "timestamp", ""],
          ],
        ),
        spacer(),

        h2("4.5 search_sessions"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["user_id", "uuid nullable → users", "Null for anonymous users"],
            ["conversation_id", "uuid nullable", ""],
            ["criteria", "jsonb", "Full search criteria snapshot"],
            ["map_lat", "numeric", "Map center when search was triggered"],
            ["map_lng", "numeric", ""],
            ["radius_km", "numeric", ""],
            ["result_count", "integer", ""],
            ["created_at", "timestamp", ""],
          ],
        ),
        spacer(),

        h2("4.6 contact_release"),
        makeTable(
          ["Field", "Type", "Notes"],
          [
            ["id", "uuid PK", ""],
            ["buyer_id", "uuid → users", ""],
            ["seller_id", "uuid → users", ""],
            ["property_id", "uuid → properties", ""],
            ["status", "enum", "pending | buyer_acked | seller_acked | released | expired"],
            ["commission_buyer_pct", "numeric", "Snapshot at time of request"],
            ["commission_seller_pct", "numeric", ""],
            ["buyer_ack_at", "timestamp nullable", ""],
            ["seller_ack_at", "timestamp nullable", ""],
            ["released_at", "timestamp nullable", ""],
            ["created_at", "timestamp", ""],
          ],
        ),
        spacer(),

        h2("4.7 Additional Tables"),
        makeTable(
          ["Table", "Key Fields", "Purpose"],
          [
            ["commission_settings", "default_buyer_pct, default_seller_pct, negotiable", "Platform-wide defaults, editable by admin"],
            ["otp_sessions", "phone, code_hash, expires_at, verified, attempts", "Phone OTP flow"],
            ["notifications", "user_id, type, title_ar, title_en, body_ar, body_en, read_at", "Bilingual in-app notifications"],
            ["audit_logs", "user_id, action, entity_type, entity_id, metadata, ip", "Full audit trail on all write operations"],
          ],
        ),
        pageBreak(),

        // ── 5. API ROUTES ──────────────────────────────────────────────────────
        h1("5. API Routes"),
        note("All routes prefixed with /api. Defined in OpenAPI spec and validated via Zod (generated by Orval)."),
        spacer(),

        h2("5.1 Authentication"),
        makeTable(
          ["Method", "Route", "Description", "Auth required"],
          [
            ["POST", "/auth/otp/request", "Request OTP — WhatsApp primary, SMS fallback. Rate limited: 3 per phone per 15 min", "No"],
            ["POST", "/auth/otp/verify", "Verify OTP → return JWT (httpOnly cookie)", "No"],
            ["GET", "/auth/me", "Get current user profile", "Yes"],
            ["PUT", "/auth/me", "Update name, language, market, auto_send_voice", "Yes"],
          ],
        ),
        spacer(),

        h2("5.2 Properties"),
        makeTable(
          ["Method", "Route", "Description", "Auth required"],
          [
            ["GET", "/properties", "Search properties. Params: lat, lng, radius_km, property_type, transaction_mode, price_min, price_max, rooms, furnished, parking, district, market", "No"],
            ["POST", "/properties", "Create a draft listing (seller/broker)", "Yes — seller/broker"],
            ["GET", "/properties/:id", "Full property detail including images", "No"],
            ["PUT", "/properties/:id", "Update property (owner or admin only)", "Yes"],
            ["DELETE", "/properties/:id", "Soft delete", "Yes — owner/admin"],
            ["POST", "/properties/:id/images", "Upload images (max 20, WebP converted)", "Yes — owner"],
            ["DELETE", "/properties/:id/images/:imageId", "Remove an image", "Yes — owner/admin"],
          ],
        ),
        spacer(),

        h2("5.3 Conversations"),
        makeTable(
          ["Method", "Route", "Description", "Auth required"],
          [
            ["POST", "/conversations", "Start a new conversation (buyer_search or seller_listing)", "Yes"],
            ["GET", "/conversations", "List user's conversations", "Yes"],
            ["GET", "/conversations/:id", "Get conversation with full message history", "Yes — owner"],
            ["POST", "/conversations/:id/messages", "Send message → guardrail → AI → extract → state advance → AI response", "Yes — owner"],
          ],
        ),
        spacer(),

        h2("5.4 Contact Release"),
        makeTable(
          ["Method", "Route", "Description", "Auth required"],
          [
            ["POST", "/contact-release", "Buyer initiates contact request for a property", "Yes — buyer"],
            ["GET", "/contact-release/:id", "Get request status", "Yes — participant"],
            ["POST", "/contact-release/:id/acknowledge", "Buyer or seller acknowledges commission terms", "Yes — participant"],
            ["GET", "/contact-release/property/:propertyId", "Check if contact already released for this property", "Yes"],
          ],
        ),
        spacer(),

        h2("5.5 Commission & Admin"),
        makeTable(
          ["Method", "Route", "Description", "Auth required"],
          [
            ["GET", "/commission/settings", "Get current platform commission rates", "No"],
            ["PUT", "/commission/settings", "Update commission rates", "Yes — admin"],
            ["GET", "/admin/users", "List all users with filters", "Yes — admin"],
            ["PUT", "/admin/users/:id", "Update user status or verification", "Yes — admin"],
            ["GET", "/admin/properties", "List all properties including drafts and pending", "Yes — admin"],
            ["PUT", "/admin/properties/:id/status", "Approve, reject, or suspend a listing", "Yes — admin"],
            ["GET", "/admin/stats", "Platform statistics: users, listings, releases, storage", "Yes — admin"],
          ],
        ),
        pageBreak(),

        // ── 6. AI SYSTEM DESIGN ────────────────────────────────────────────────
        h1("6. AI System Design"),

        h2("6.1 Model"),
        body("Gemini Flash 2.0 via Google AI SDK. Free tier: 1,500 requests/day — sufficient for entire MVP phase and hundreds of early users. At 10,000 monthly active users the AI cost is approximately $60/month."),
        body("The AI client is a single abstraction module. Switching to GPT-4o-mini, GPT-4o, or any other model requires changing one configuration value — no route or service code changes."),
        spacer(),

        h2("6.2 Five AI Services"),
        makeTable(
          ["Service", "Responsibility"],
          [
            ["Guardrails", "Classifies each user message as on-topic or off-topic BEFORE calling the AI model. Keyword pass + intent check. Off-topic messages return a redirect response immediately at near-zero cost. Prevents jailbreaking and irrelevant AI usage."],
            ["Context Builder", "Constructs the system prompt dynamically per call. Inputs: user role, market (JO/SA), conversation type, current state machine step, fields already extracted, fields still missing. Injects market-specific vocabulary (e.g., استراحة for KSA, دونم unit clarification for JO)."],
            ["Extraction Service", "Given the full conversation history, extracts structured fields matching the property schema. Uses Gemini structured output (JSON mode) — the model cannot deviate from the schema. Unknown/uncertain fields return null, which triggers a follow-up question. Never guesses."],
            ["Conversation Engine", "State machine for each conversation. Buyer flow: 8 states from greeting to contact request. Seller flow: 8 states from greeting to submit-ready. Machine knows current state, what data is collected, what is missing, and which state to advance to when a field is filled."],
            ["Guidance Service", "Given a property record with null fields, generates natural-language nudge strings. Format: 'Buyers often ask about X — adding this helps them decide faster.' Never shows a score or percentage. Used after critical fields are filled to encourage completeness."],
          ],
        ),
        spacer(),

        h2("6.3 Seller Conversation Flow"),
        makeTable(
          ["State", "AI asks about", "Advances when"],
          [
            ["1. greeting", "Welcome, establishes seller flow", "User sends first message"],
            ["2. category", "Property type (شقة، فيلا، أرض، ...)", "property_type extracted"],
            ["3. transaction_type", "Sale or rent; if rent, period (daily/weekly/monthly)", "transaction_mode + rental_period extracted"],
            ["4. location", "District and city", "district + city extracted"],
            ["5. pricing", "Price and currency", "price + price_currency extracted"],
            ["6. details", "Rooms, bathrooms, area (one at a time)", "Minimum details for a publishable listing"],
            ["7. guidance_review", "Optional fields via nudges (furnished, parking, floor, etc.)", "User submits or skips remaining"],
            ["8. submit_ready", "Shows draft summary, confirms submission", "User taps Submit"],
          ],
        ),
        spacer(),

        h2("6.4 Buyer Conversation Flow"),
        makeTable(
          ["State", "AI asks about", "Advances when"],
          [
            ["1. greeting", "Welcome, establishes buyer flow", "User sends first message"],
            ["2. type_collection", "Property type they are looking for", "property_type extracted"],
            ["3. transaction_type", "Buy or rent; if rent, preferred period", "transaction_mode extracted"],
            ["4. budget_collection", "Budget range and currency", "price_min/max extracted"],
            ["5. location_collection", "Preferred district or city", "district or city extracted"],
            ["6. details_collection", "Rooms, furnished preference, parking", "Sufficient criteria for search"],
            ["7. searching", "AI triggers property search with extracted criteria", "Results fetched from DB"],
            ["8. results_presented", "AI presents results, offers map view", "User chooses a property or refines"],
          ],
        ),
        spacer(),

        h2("6.5 Extraction Example"),
        body("User says:", { italic: true }),
        body('"عندي شقة 3 غرف نوم للبيع السعر 50 ألف دينار"'),
        spacer(),
        body("Extraction output (JSON):"),
        new Paragraph({
          children: [
            new TextRun({
              text: '{ "listing_direction": "offering", "property_type": "apartment", "rooms": 3, "transaction_mode": "sale", "price": 50000, "price_currency": "JOD" }',
              font: "Courier New",
              size: 18,
              color: "1A5276",
            }),
          ],
          spacing: { after: 120 },
          indent: { left: convertInchesToTwip(0.4) },
        }),
        body("All other fields → null. State machine advances to step 4 (location). AI asks: وين الموقع تقريبًا؟"),
        pageBreak(),

        // ── 7. VOICE INPUT UX ─────────────────────────────────────────────────
        h1("7. Voice Input UX"),

        h2("7.1 STT Method"),
        body("Browser Web Speech API — runs client-side, supports Arabic and English, no server cost, no audio stored. Language hint set from user market setting (JO → ar-JO, SA → ar-SA)."),
        spacer(),

        h2("7.2 Input Field Behavior"),
        makeTable(
          ["Situation", "Mic button behavior"],
          [
            ["Input field is empty", "Tap mic → record → transcript replaces field (replace mode)"],
            ["Input field has text", "Tap mic → record → transcript APPENDED to existing text (append mode). New speech joins with a natural separator (،). AI sees the full combined message."],
            ["User wants to correct a single word", "Tap the text field → keyboard opens → edit directly"],
            ["User wants to start completely over", "Tap Clear button → field empties → back to replace mode"],
          ],
        ),
        spacer(),

        h2("7.3 Three Control Buttons When Field Has Text"),
        bullet("Mic button — append more voice"),
        bullet("Edit icon — open keyboard for direct text correction"),
        bullet("Clear button — wipe everything and start over"),
        spacer(),

        h2("7.4 Auto-Send Setting"),
        body("Located in user Settings screen alongside language and market preferences."),
        makeTable(
          ["Setting", "Default", "Behavior"],
          [
            ["Auto-send transcript (إرسال تلقائي بعد التحويل)", "OFF", "OFF: Transcript waits in field for user review, then manual Send tap. ON: Transcript sent to AI immediately when STT finishes."],
          ],
        ),
        note("Default is OFF. In real estate, a wrong word (wrong price, wrong room count) leads to a wrong AI response. New users should review. Experienced users can enable auto-send for speed."),
        spacer(),

        h2("7.5 No Audio Files Stored"),
        body("The Web Speech API returns text only — no audio file is produced. The system stores the text transcript only. This is the right design for three reasons:"),
        bullet("Privacy compliance: Jordan PDPL 2023 and KSA PDPL require explicit consent for voice data storage"),
        bullet("Storage cost: audio scales badly; text is essentially free"),
        bullet("The transcript is all that is needed for extraction, audit, and dispute resolution"),
        spacer(),

        h2("7.6 Two Opt-In Audio Exceptions (Both Require Explicit User Consent)"),
        makeTable(
          ["Exception", "When", "Phase"],
          [
            ["Seller voice note attached to listing", "Seller explicitly chooses to attach an audio description of their property. Displayed on property detail page for buyers.", "MVP or Phase 2"],
            ["Automated verification call recording", "When CPaaS voice calls are implemented. Users notified at the start of the call: 'This call may be recorded.'", "Post-MVP"],
          ],
        ),
        pageBreak(),

        // ── 8. MULTI-MARKET & LOCALIZATION ─────────────────────────────────────
        h1("8. Multi-Market & Localization"),

        h2("8.1 Market Setting"),
        body("Each user has a market field (JO, SA, AE, EG, ...) set during registration and changeable in profile. This controls:"),
        bullet("Default currency (JO → JOD, SA → SAR)"),
        bullet("Dialect hints injected into AI system prompt"),
        bullet("Local property type vocabulary (استراحة for SA, etc.)"),
        bullet("Local measurement units (JO: دونم = 1,000 m²; SA: primarily uses m²)"),
        bullet("Speech recognition language hint (ar-JO, ar-SA, en-US)"),
        spacer(),

        h2("8.2 KSA-Specific Property Types and Attributes"),
        makeTable(
          ["KSA-specific term", "Meaning", "Included in schema"],
          [
            ["استراحة", "Rest house / recreational property", "Yes — in property_type enum"],
            ["عزبة", "Farm / rural estate", "Yes — mapped to farm in enum"],
            ["مخطط", "Planned subdivision / land plot ID", "Yes — address_full field"],
            ["غرفة سائق", "Driver's room", "Yes — has_drivers_room boolean field"],
            ["دور", "Unit/floor in a villa (used differently than Levantine)", "Handled by AI context prompt"],
          ],
        ),
        spacer(),

        h2("8.3 Currency"),
        makeTable(
          ["Market", "Default currency", "Code"],
          [
            ["Jordan", "Jordanian Dinar", "JOD"],
            ["Saudi Arabia", "Saudi Riyal", "SAR"],
            ["International reference", "US Dollar", "USD"],
            ["UAE (future)", "UAE Dirham", "AED"],
            ["Kuwait (future)", "Kuwaiti Dinar", "KWD"],
            ["Egypt (future)", "Egyptian Pound", "EGP"],
          ],
        ),
        note("Currency ambiguity (e.g., user says 'دينار' without specifying): resolved from user market setting, not guessed from text."),
        spacer(),

        h2("8.4 Currency Ambiguity Handling"),
        body("If a user in Jordan says '50 ألف دينار', the system maps to JOD because market = JO. If a user's market is KWD and they say 'دينار', it maps to KWD. The AI prompt includes: 'This user is in [market]. Currency is [code].'"),
        spacer(),

        h2("8.5 Language and RTL"),
        makeTable(
          ["Item", "Implementation"],
          [
            ["Default layout direction", "RTL — set on <html dir='rtl'>"],
            ["English mode", "Flips to LTR — set on <html dir='ltr'>"],
            ["Tailwind CSS", "Logical properties used throughout: ms/me instead of ml/mr, ps/pe instead of pl/pr"],
            ["Translation files", "Arabic (ar.json) and English (en.json) — all UI strings translated"],
            ["Mapbox", "Arabic locale configured for map labels and UI"],
          ],
        ),
        pageBreak(),

        // ── 9. MONETIZATION ───────────────────────────────────────────────────
        h1("9. Monetization Model"),
        body("Buyers are never charged for searching — friction on buyers kills the platform. Revenue comes from the seller side and from the moment of value exchange."),
        spacer(),

        h2("9.1 Revenue Streams"),
        makeTable(
          ["Stream", "Who pays", "Mechanism"],
          [
            ["Contact release fee", "Buyer + Seller (both)", "Small flat fee per unlock of contact info — charged when both parties acknowledge commission terms. The natural monetization point: both parties are motivated and a real deal is in progress."],
            ["Listing fee (basic)", "Seller", "Per listing, or monthly for individual sellers"],
            ["Broker subscription", "Broker", "Monthly flat fee: unlimited listings, verified broker badge, priority placement"],
            ["Premium placement", "Seller / Broker", "Pay to appear at top of search in their district"],
          ],
        ),
        spacer(),

        h2("9.2 Seller Tiers"),
        makeTable(
          ["Tier", "Price", "Active listings", "Images per listing", "Duration", "Features"],
          [
            ["Free", "$0", "2", "10", "30 days", "Standard placement"],
            ["Verified Seller", "~$5/month", "10", "20", "90 days", "Verified badge, standard placement"],
            ["Broker Plan", "~$25-50/month", "Unlimited", "20", "90 days", "Priority placement, broker profile, analytics"],
          ],
        ),
        spacer(),

        h2("9.3 Cost Projection"),
        makeTable(
          ["Monthly active users", "AI cost (Gemini)", "Map cost (Mapbox)", "OTP SMS cost", "Total tech cost"],
          [
            ["100 (MVP)", "<$1", "$0 (free tier)", "~$2 (new signups)", "~$3"],
            ["1,000", "~$6", "$0 (free tier)", "~$20", "~$26"],
            ["10,000", "~$60", "~$50", "~$200", "~$310"],
            ["100,000", "~$600", "~$500", "~$2,000", "~$3,100"],
          ],
        ),
        note("At 10,000 users the platform generates meaningful revenue from contact release fees and broker subscriptions while incurring only ~$310/month in variable tech costs. The model is comfortably sustainable."),
        pageBreak(),

        // ── 10. BUILD PHASES ──────────────────────────────────────────────────
        h1("10. Build Phases — Detailed Steps"),

        h2("Phase 1 — Foundation"),
        body("Goal: A working skeleton where a user can register, log in, and create a property listing.", { bold: true }),
        spacer(),

        h3("Step 1 — Web Frontend Artifact"),
        bullet("Create artifacts/web: React + Vite + TypeScript + Tailwind v4"),
        bullet("Arabic RTL as default (html dir=rtl), language toggle"),
        bullet("React Router v7: routes for /, /property/:id, /chat, /list, /profile, /auth, /contact-release/:id, /admin"),
        bullet("Bottom navigation bar: Home, Search, Chat, List, Profile"),
        bullet("TanStack Query v5 configured with the generated API hooks"),
        bullet("i18next configured with ar.json and en.json translation files"),
        bullet("Register as artifact, configure workflow with PORT env var"),
        spacer(),

        h3("Step 2 — Database Schema"),
        bullet("Define all 10 tables in lib/db/src/schema/ (one file per table)"),
        bullet("Export all from lib/db/src/schema/index.ts"),
        bullet("Run: pnpm --filter @workspace/db run push"),
        spacer(),

        h3("Step 3 — OpenAPI Spec + Codegen"),
        bullet("Expand lib/api-spec/openapi.yaml with all routes (auth, properties, conversations, contact-release, commission, admin)"),
        bullet("Define all request/response schemas"),
        bullet("Run: pnpm --filter @workspace/api-spec run codegen"),
        bullet("Verify generated Zod schemas in lib/api-zod and hooks in lib/api-client-react"),
        spacer(),

        h3("Step 4 — Authentication API"),
        bullet("artifacts/api-server/src/routes/auth.ts"),
        bullet("artifacts/api-server/src/services/auth.ts: OTP generation, bcrypt hash, 10-min expiry, rate limit (3 per phone per 15 min)"),
        bullet("Dev mode: OTP logged to console (no provider needed)"),
        bullet("JWT signed on verify, returned as httpOnly cookie + bearer token"),
        bullet("artifacts/api-server/src/middleware/authenticate.ts — JWT verification"),
        bullet("artifacts/api-server/src/middleware/authorize.ts — role checking"),
        spacer(),

        h3("Step 5 — Auth Frontend"),
        bullet("Phone input with country code selector (JO +962, SA +966 defaults)"),
        bullet("OTP input: 6-digit, auto-advance between boxes"),
        bullet("First login: role selection screen (Buyer / Seller / Broker) + name input"),
        bullet("Redirects to intended page after login"),
        spacer(),

        h3("Step 6 — Property CRUD API"),
        bullet("GET /properties with Haversine geo-search + all filters"),
        bullet("POST /properties — creates draft, linked to authenticated user"),
        bullet("GET /properties/:id — full detail + images"),
        bullet("PUT /properties/:id — owner or admin only"),
        bullet("DELETE /properties/:id — soft delete"),
        spacer(),

        h3("Step 7 — Image Upload"),
        bullet("POST /properties/:id/images — multer multipart upload"),
        bullet("Sharp: resize to max 1200px, convert to WebP"),
        bullet("EXIF GPS extracted and stored in property_images.gps_lat / gps_lng"),
        bullet("Max 20 images per property enforced at upload"),
        spacer(),

        h2("Phase 2 — AI Workflow"),
        body("Goal: The AI conversation engine is live. Sellers and buyers can complete flows.", { bold: true }),
        spacer(),

        h3("Step 8 — AI Service Layer"),
        bullet("artifacts/api-server/src/services/ai/client.ts — Gemini Flash 2.0 singleton"),
        bullet("artifacts/api-server/src/services/ai/guardrails.ts — off-topic classifier"),
        bullet("artifacts/api-server/src/services/ai/extraction.ts — structured field extraction via JSON mode"),
        bullet("artifacts/api-server/src/services/ai/context-builder.ts — dynamic system prompt with market/dialect injection"),
        bullet("artifacts/api-server/src/services/ai/guidance.ts — missing field nudge generator"),
        bullet("artifacts/api-server/src/services/ai/conversation-engine.ts — state machine"),
        spacer(),

        h3("Step 9 — Conversation API"),
        bullet("POST /conversations — create, assign type, return initial AI greeting"),
        bullet("POST /conversations/:id/messages — full pipeline: guardrail → context → AI → extract → state advance → response"),
        spacer(),

        h3("Step 10 — Chat Frontend"),
        bullet("Chat screen with RTL-aware message bubbles"),
        bullet("AI messages on right (distinct color), user messages on left"),
        bullet("Typing indicator while awaiting AI response"),
        bullet("Extracted criteria displayed as tags at top of conversation"),
        bullet("Voice input: mic button, append mode when field has text, edit and clear controls"),
        bullet("Auto-send setting toggle in user settings"),
        bullet("Seller flow: 'Add Images' button appears at details state"),
        bullet("Buyer flow: 'View on Map' button appears when results are ready"),
        spacer(),

        h2("Phase 3 — Map"),
        body("Goal: Full geo-aware property discovery experience.", { bold: true }),
        spacer(),

        h3("Step 11 — Mapbox + Home Screen"),
        bullet("Install mapbox-gl + react-map-gl in artifacts/web"),
        bullet("Full-screen map as home page"),
        bullet("Floating search bar at top, draggable property list bottom sheet"),
        bullet("User location button (browser geolocation)"),
        bullet("Filter chips: category, transaction mode, budget, rooms"),
        spacer(),

        h3("Step 12 — Property Markers"),
        bullet("PropertyMarker component — tap opens property card"),
        bullet("Marker clustering at low zoom levels"),
        bullet("Visual radius circle overlay"),
        bullet("Map pan/zoom triggers new search (debounced 500ms)"),
        bullet("AI buyer results: 'View on Map' centers map on matched properties"),
        spacer(),

        h2("Phase 4 — Trust & Contact Release"),
        body("Goal: The complete trust and commission acknowledgment flow is operational.", { bold: true }),
        spacer(),

        h3("Step 13 — Contact Release Flow"),
        bullet("'Request Contact' button on property detail (visible to buyers only, when logged in)"),
        bullet("Commission terms screen: buyer_pct + seller_pct + platform terms text"),
        bullet("Buyer acknowledges → DB logged with timestamp → seller notified (in-app notification)"),
        bullet("Seller receives notification → views request → acknowledges same terms"),
        bullet("Status transitions: pending → buyer_acked → released (when both acked)"),
        bullet("Phone numbers shown ONLY after status = released"),
        bullet("Button changes to 'Contact Exchanged' — no re-request possible"),
        spacer(),

        h3("Step 14 — Admin Dashboard"),
        bullet("Four tabs: Users | Properties | Contact Requests | Stats"),
        bullet("Users tab: list, filter by role/status, verify/suspend actions"),
        bullet("Properties tab: list all, filter by status, approve/reject pending listings"),
        bullet("Stats tab: total users, active listings, contact releases this month, storage used"),
        spacer(),

        h2("Phase 5 — Polish"),
        body("Goal: Production-ready quality, security, and mobile UX.", { bold: true }),
        spacer(),

        h3("Step 15 — Mobile & RTL Polish"),
        bullet("Full Arabic/English translation coverage — every UI string in ar.json and en.json"),
        bullet("RTL layout audit across all pages"),
        bullet("Minimum 48px touch targets throughout"),
        bullet("Smooth page transitions (slide, fade)"),
        bullet("Skeleton loaders for async content"),
        spacer(),

        h3("Step 16 — Storage Cleanup"),
        bullet("Scheduled job: delete images for properties where deleted_at is older than 30 days"),
        bullet("Admin stats shows disk usage"),
        bullet("Per-property image count enforced at upload (max 20)"),
        spacer(),

        h3("Step 17 — Security Hardening"),
        bullet("Rate limiting on all write endpoints (express-rate-limit)"),
        bullet("CORS locked to production domains only in production mode"),
        bullet("Audit log coverage: user creation, property status changes, contact releases, admin actions"),
        bullet("Input sanitization review pass"),
        bullet("JWT expiry and refresh review"),
        spacer(),

        h2("Post-MVP — Phase 6"),
        body("Scheduled for after the MVP is live and has real users.", { bold: true }),
        spacer(),

        h3("Voice Verification Calls (CPaaS)"),
        bullet("Integrate Infobip or Twilio for automated outbound calls"),
        bullet("AI-generated TTS script (OpenAI TTS or Azure Cognitive Services)"),
        bullet("OpenAI Whisper for call transcription"),
        bullet("Explicit consent notice at call start: 'This call may be recorded'"),
        bullet("Transcript + call metadata stored in audit_logs"),
        bullet("Retry policy and failed verification handling"),
        pageBreak(),

        // ── 11. FOLDER STRUCTURE ──────────────────────────────────────────────
        h1("11. Folder Structure"),
        spacer(),
        new Paragraph({
          children: [
            new TextRun({
              text: [
                "artifacts/",
                "  api-server/src/",
                "    routes/",
                "      auth.ts               ← NEW",
                "      properties.ts         ← NEW",
                "      conversations.ts      ← NEW",
                "      contact-release.ts    ← NEW",
                "      admin.ts              ← NEW",
                "      commission.ts         ← NEW",
                "    services/",
                "      ai/",
                "        client.ts           ← Gemini abstraction layer",
                "        guardrails.ts       ← Off-topic classifier",
                "        extraction.ts       ← Structured field extraction",
                "        context-builder.ts  ← System prompt builder",
                "        guidance.ts         ← Listing completeness nudges",
                "        conversation-engine.ts ← State machine",
                "      auth.ts               ← OTP + JWT logic",
                "      storage.ts            ← Image handling",
                "    middleware/",
                "      authenticate.ts       ← JWT middleware",
                "      authorize.ts          ← Role middleware",
                "",
                "  web/                      ← NEW artifact",
                "    src/",
                "      pages/",
                "        Home.tsx            ← Map-centric search",
                "        Property.tsx        ← Property detail",
                "        Chat.tsx            ← AI conversation",
                "        Auth.tsx            ← Phone + OTP",
                "        Profile.tsx",
                "        ContactRelease.tsx",
                "        Admin.tsx",
                "      components/",
                "        map/                ← MapView, Markers, Cluster, Radius",
                "        chat/               ← ChatInterface, Bubble, VoiceInput",
                "        property/           ← Card, Detail, ImageGallery, Form",
                "        auth/               ← PhoneInput, OTPInput",
                "        layout/             ← BottomNav, TopBar, RTL wrapper",
                "        admin/              ← Tables, StatsCards",
                "      lib/",
                "        i18n/               ← ar.json, en.json",
                "        hooks/              ← Custom React hooks",
                "        utils/              ← Helpers, formatters",
                "",
                "lib/",
                "  db/src/schema/",
                "    users.ts               ← NEW",
                "    properties.ts          ← NEW",
                "    property-images.ts     ← NEW",
                "    conversations.ts       ← NEW",
                "    search-sessions.ts     ← NEW",
                "    contact-release.ts     ← NEW",
                "    commission-settings.ts ← NEW",
                "    otp-sessions.ts        ← NEW",
                "    audit-logs.ts          ← NEW",
                "    notifications.ts       ← NEW",
                "    index.ts               ← exports all",
                "  api-spec/openapi.yaml    ← EXPANDED",
                "  api-zod/                 ← GENERATED",
                "  api-client-react/        ← GENERATED",
              ].join("\n"),
              font: "Courier New",
              size: 17,
            }),
          ],
          spacing: { after: 200 },
        }),
        pageBreak(),

        // ── 12. MVP DONE DEFINITION ───────────────────────────────────────────
        h1("12. What 'Done' Looks Like (MVP)"),
        spacer(),
        makeTable(
          ["Feature", "Status"],
          [
            ["User registers via phone OTP and chooses role", "Phase 1"],
            ["Seller creates a listing through AI conversation — guided field by field", "Phase 2"],
            ["Seller uploads property images", "Phase 1"],
            ["Buyer searches via AI chat — criteria narrowed step by step", "Phase 2"],
            ["Search results appear on map as tappable pins", "Phase 3"],
            ["Tapping a pin opens the property detail page", "Phase 3"],
            ["Buyer requests contact for a property", "Phase 4"],
            ["Both parties must acknowledge commission terms before phone numbers are revealed", "Phase 4"],
            ["Admin can view all users and properties, approve or reject listings", "Phase 4"],
            ["All UI text available in Arabic and English", "Phase 5"],
            ["RTL layout works correctly throughout", "Phase 5"],
            ["Mobile-first layout works on 375px–430px screen widths", "Phase 1"],
            ["Platform runs on Jordan (JO) and Saudi Arabia (SA) market settings", "Phase 1–2"],
          ],
        ),
        spacer(),
        spacer(),
        new Paragraph({
          children: [
            new TextRun({
              text: "— End of AqariTalk Final Build Plan v1.0 —",
              italics: true,
              color: "888888",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("AqariTalk_Build_Plan.docx", buffer);
console.log("Done: AqariTalk_Build_Plan.docx");
