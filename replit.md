# AqariTalk

AI-guided real estate workflow platform for Jordan and Saudi Arabia — Arabic-first, mobile-first, voice-capable.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/web run dev` — run the web frontend (port varies, set by Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `GEMINI_API_KEY` — Google AI Studio key (AQ. prefix format)
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: `@google/genai` v1.x → `gemini-2.5-flash` (AQ. keys only work with v1.x SDK)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle, `@google/genai` kept external)
- Frontend: React 19 + Vite + Tailwind v4, RTL Arabic-first

## Where things live

- `artifacts/api-server/src/routes/` — Express route handlers (auth, conversations, properties, contact-release, commission, admin)
- `artifacts/api-server/src/services/ai/` — Gemini client, state machine, extraction, guardrails, context-builder
- `artifacts/api-server/src/services/auth.ts` — OTP generation/verification, JWT signing
- `artifacts/web/src/pages/` — React pages (home, chat, auth, profile, admin, contact-release)
- `artifacts/web/src/hooks/` — useSpeechInput, useAuth, use-toast
- `lib/db/src/schema/` — all Drizzle table definitions
- `lib/api-spec/openapi.yaml` — OpenAPI 3.0 source of truth
- `lib/api-zod/` — generated Zod schemas (from codegen)
- `lib/api-client-react/` — generated React Query hooks (from codegen)

## Architecture decisions

1. **AI is a state machine, not a free chatbot.** Conversation engine tracks state (buyer: type_collection → budget → location → details → searching; seller: greeting → category → transaction_type → location → pricing → details → guidance → submit_ready). Gemini fills in natural language; structure is code.
2. **Off-topic guardrail runs before the AI call.** Cheap local keyword check prevents wasting tokens. Critical: use full Arabic word forms not bare roots — "دين" (religion) is a substring of "دينار" (currency), causing false positives on price mentions.
3. **Phone numbers gated behind dual acknowledgment.** Neither party sees the other's number until both accept commission terms. Timestamps logged.
4. **OTP provider is an interface.** Dev logs code to console. Production plugs in Infobip/WhatsApp without changing route code.
5. **Seller conversations start at state "greeting"**, buyers start at "type_collection". Initial state varies by conversation type — don't hardcode "type_collection" for all.

## Product

- **Buyer flow**: AI chat collects criteria (type, budget, location, details) → searches properties → shows map results → contact release
- **Seller flow**: AI chat collects property details step-by-step → guidance on missing fields → submit listing
- **Map**: Full-screen Mapbox map, property pins, radius search (Mapbox token not yet configured)
- **Contact release**: Buyer requests contact → both parties acknowledge commission terms → phone numbers revealed
- **Admin**: User management, property approval, stats

## User preferences

_None recorded yet._

## Gotchas

- `@google/genai` v1.x is required for AQ.-prefix keys. `@google/generative-ai` v0.24 does NOT support them (silent quota=0 failure).
- `gemini-2.5-flash` has free-tier quota on this key. `gemini-2.0-flash` and `gemini-2.0-flash-lite` do not (quota=0).
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.
- Always run `pnpm --filter @workspace/db run push` after changing schema files in `lib/db/src/schema/`.
- Mapbox token (`VITE_MAPBOX_TOKEN`) is not yet configured — map features will not render until it's added.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.agents/memory/gemini-config.md` for Gemini SDK setup details
- See `.agents/memory/guardrail-dinar-bug.md` for the Arabic keyword collision pitfall
