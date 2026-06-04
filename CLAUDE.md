# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AqariTalk is an Arabic-first, mobile-first, voice-capable AI-guided real estate platform for Jordan and Saudi Arabia. It is a **pnpm-workspaces monorepo** (Node 24, TypeScript 5.9). `pnpm` is enforced — a `preinstall` hook rejects npm/yarn.

## Commands

```bash
# Install (must use pnpm)
pnpm install

# Dev servers (run each in its own terminal)
pnpm --filter @workspace/api-server run dev   # API on :8080 (builds then starts; no watch)
pnpm --filter @workspace/web run dev          # web frontend (Vite)

# Quality gates
pnpm run typecheck        # typecheck:libs (tsc --build) then all artifacts/* + scripts
pnpm run build            # typecheck + recursive build
pnpm run typecheck:libs   # just the lib/* project references

# Single package typecheck (faster feedback loop)
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/web run typecheck

# Regenerate API client + Zod from the OpenAPI spec (REQUIRED after editing openapi.yaml)
pnpm --filter @workspace/api-spec run codegen

# Push DB schema to Postgres (REQUIRED after editing lib/db/src/schema/*; dev only)
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run push-force   # destructive, skips confirmation

# Full stack via Docker (Postgres + api + web)
docker compose up
```

There is **no test runner configured** in this repo — `typecheck` and `build` are the verification gates.

## Required environment

`DATABASE_URL` (Postgres), `GEMINI_API_KEY` (Google AI Studio), `SESSION_SECRET` (JWT signing). Copy `.env.example` to `.env`. Docker Compose pre-wires `DATABASE_URL`. `VITE_MAPBOX_TOKEN` is needed for map rendering and is not yet configured.

## Architecture

The codegen + schema flow is the spine of the monorepo — three layers, each generated/derived from the one before:

1. `lib/api-spec/openapi.yaml` is the **single source of truth** for the HTTP API.
2. Orval codegen produces `lib/api-zod/` (Zod schemas + types) and `lib/api-client-react/` (TanStack React Query hooks). **These directories are generated — never hand-edit `src/generated/`.** Edit `openapi.yaml` then run codegen.
3. `lib/db/src/schema/` holds Drizzle table definitions (one file per table). `push` syncs them to Postgres.

The API server (`@workspace/api-server`) and web app (`@workspace/web`) consume the generated packages via `workspace:*` deps. The web app imports React Query hooks from `@workspace/api-client-react`; the server imports Zod schemas from `@workspace/api-zod` and DB access from `@workspace/db`.

Build note: the API server bundles with **esbuild to an ESM bundle**, keeping `@google/genai` external. Source is at `artifacts/api-server/src`, output at `dist/index.mjs`.

### API server layout (`artifacts/api-server/src`)
- `app.ts` — Express 5 app: pino-http logging, CORS, two rate limiters (general writes 60/min; AI messages 20/min on `/api/conversations/:id/messages`), static `/api/uploads`, mounts `routes/`.
- `routes/` — handlers per domain: auth, conversations, properties, contact-release, commission, admin, notifications, images, health.
- `services/ai/` — the conversation engine (see below).
- `services/otp.ts` — OTP generation/verification (provider is an interface: dev logs to console, prod plugs in Infobip/WhatsApp without route changes).

### The AI conversation engine (`services/ai/`)
**The AI is a state machine, not a free chatbot.** `state-machine.ts` defines explicit `BuyerState`/`SellerState` enums and transition tables with `requiredFields`; code owns the structure, Gemini only fills in natural language. Buyer flow: `type_collection → budget → location → details → searching → results → contact_request`. Seller flow: `greeting → category → transaction_type → location → pricing → details → guidance_review → submit_ready`. **Initial state varies by conversation type** — sellers start at `greeting`, buyers at `type_collection`; don't hardcode one for all.

- `guardrails.ts` — a cheap local keyword off-topic check runs **before** the Gemini call to avoid wasting tokens.
- `extraction.ts` / `context-builder.ts` / `guidance.ts` — structured field extraction, prompt context assembly, missing-field guidance.
- `client.ts` — Gemini client.

### Web app (`artifacts/web/src`)
React 19 + Vite + Tailwind v4, **RTL Arabic-first**. `pages/` (home, chat, auth, profile, admin, contact-release), `components/ui/` (shadcn-style Radix primitives), `components/map/` (Mapbox), `i18n/` (ar.json/en.json via i18next), `hooks/useSpeechInput.ts` (voice), `contexts/auth.tsx`. Routing via `wouter`.

`artifacts/mockup-sandbox/` is a separate design/preview sandbox, not part of the shipping app.

## Critical gotchas

- **Gemini SDK + keys are version-coupled.** AQ.-prefix keys require `@google/genai` v1.x; `@google/generative-ai` v0.24 silently fails (quota=0) with them. `gemini-2.5-flash` has free-tier quota; `gemini-2.0-flash`/`-lite` report quota=0. (`.env.example` describes the AIza-prefix free-tier path.)
- **Arabic keyword matching: use full word forms, not bare roots.** "دين" (religion) is a substring of "دينار" (currency) — matching the root causes false off-topic positives on price mentions. See `.agents/memory/guardrail-dinar-bug.md`.
- After editing `openapi.yaml` → run codegen. After editing `lib/db/src/schema/*` → run `db push`. The generated dirs and DB will otherwise drift from source.
- **Contact release is dual-gated:** neither buyer nor seller sees the other's phone number until both acknowledge commission terms (timestamps logged).

## More context

`replit.md` holds the maintained product/architecture notes (kept in sync with this file). `.agents/memory/` has focused notes on Gemini setup, the dinar-guardrail bug, OTP response shape, and the Vite workflow port.
