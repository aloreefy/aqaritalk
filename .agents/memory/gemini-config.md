---
name: Gemini SDK and model config
description: Which SDK version, API key format, and model to use for Gemini in AqariTalk.
---

# Gemini SDK and Model Configuration

**Rule:** Use `@google/genai` v1.x (the new unified SDK). Never use `@google/generative-ai` v0.24.x.

**Why:** AQ.-prefix API keys from aistudio.google.com are only supported by `@google/genai` v1.x. The old SDK treats AQ. keys as unauthenticated (quota = 0), causing 429 errors on every call.

**How to apply:**
- Package: `@google/genai` (NOT `@google/generative-ai`)
- Import: `import { GoogleGenAI } from "@google/genai"`
- Init: `new GoogleGenAI({ apiKey })`
- Chat: `ai.chats.create({ model, config: { systemInstruction }, history })` then `chat.sendMessage({ message })`
- Result text: `result.text`

**Model quota on this project's key:**
- `gemini-2.0-flash` → quota = 0 (free tier disabled for this model on this key)
- `gemini-2.0-flash-lite` → quota = 0
- `gemini-2.5-flash` → **WORKS** (free tier available)
- `gemini-2.5-flash-lite` → also returns 200

**Current model:** `FLASH_MODEL = "gemini-2.5-flash"` in `artifacts/api-server/src/services/ai/client.ts`

**Build note:** esbuild keeps `@google/genai` as an external ESM import in the `.mjs` bundle. Node.js resolves it from `artifacts/api-server/node_modules` at runtime. This is correct behavior — do not try to bundle it inline.
