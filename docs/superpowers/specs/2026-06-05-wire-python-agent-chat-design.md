# Wire the Python broker agent into the chat UI

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** Local dev only

## Goal

Replace the cloud-Gemini conversation engine behind the chat UI with the local
Python broker agent (Gemma + 2 tools). A user chatting in `pages/chat` talks to
the tool-using agent, which can `search_properties` and `create_listing` against
Postgres. No frontend changes; results are returned as plain Arabic text.

## Decisions (locked)

- **Role:** Python agent *replaces* Gemini. The chat no longer calls Gemini.
- **State machine:** **Dropped.** The Node route stops doing field extraction and
  buyer/seller state transitions. The agent owns the conversation flow itself.
- **Bridge:** Approach A — a persistent Python FastAPI sidecar that loads Gemma
  once and stays hot. Node forwards each message over HTTP.
- **Port:** Sidecar listens on `8000`.
- **Results UI:** Text only. No PropertyCard wiring this round.
- **Target:** Local dev on Windows. No Docker packaging of the model, no cloud.

## Architecture

```
Chat UI ── POST /api/conversations/:id/messages ──> Node route (Docker)
                                                       │
                       Node owns: auth, load convo, cheap guardrail, persistence
                                                       │
                       POST http://host.docker.internal:8000/chat
                       { message, history }                │
                                                     Python sidecar (Windows host)
                                                     FastAPI + Gemma (hot in RAM)
                                                     agent.run(message, history)
                                                     → may call search/create tools
                                                       │
                       { reply } <─────────────────────┘
                                                       │
                       append user+assistant msgs, save, return to UI
```

### Critical gotcha: Docker → host networking

The Node api-server runs **inside Docker** (the repo strips non-Linux native
binaries, so esbuild can't run natively on Windows). The Python sidecar runs on
the **Windows host** because that is where the Gemma GGUF and llama.cpp live.

Therefore Node must reach the sidecar at **`http://host.docker.internal:8000`**,
not `localhost`. `host.docker.internal` resolves to the host from inside a
container on Docker Desktop for Windows. This is configured via the `AGENT_URL`
env var so it can differ between "Node in Docker" and any future "Node native".

## Components

### 1. `agent/server.py` (new)
- FastAPI app, single endpoint `POST /chat`.
- Loads the Gemma `Llama` model **once** at startup (module-level / lifespan),
  passes the instance into `agent.run(...)` so the model is never reloaded
  per request.
- Request body: `{ "message": str, "history": [{"role": "user"|"assistant", "content": str}] }`.
- Response body: `{ "reply": str }`.
- Also exposes `GET /health` returning `{"status": "ok"}` for a readiness check.
- Binds `0.0.0.0:8000` so the Docker container can reach it across the host
  boundary (binding `127.0.0.1` would refuse the container's connection).

### 2. `agent/agent.py` (edit)
- `run(user_message, model=None, history=None, max_steps=5, verbose=False)`.
- New `history` param: a list of prior `{role, content}` turns. It is folded
  into the `messages` list the model sees, **after** the system prompt and
  **before** the new user message, so the agent has multi-turn memory.
- Gemma has no system role, so the existing "fold system prompt into first user
  turn" approach is kept; history turns follow as alternating user/assistant.
- The CLI entry point (`__main__`) stays working with `history=None`.

### 3. `artifacts/api-server/src/routes/conversations.ts` (edit)
- In `POST /conversations/:id/messages`, **remove** the Gemini call block and the
  extraction / state-machine block (`extractBuyerCriteria`, `advanceBuyerState`,
  `extractSellerData`, `advanceSellerState`, submit-intent override, and the
  `buildSystemPrompt` + `createChat` usage).
- **Keep** auth, the conversation load, the `status !== "active"` guard, and the
  cheap local `isOffTopic` guardrail (it still saves a model round-trip).
- After the guardrail passes, build a `history` array from `convo.messages`
  (map `assistant`→`assistant`, `user`→`user`, drop timestamps) and `POST` it
  plus the new `userText` to `${AGENT_URL}/chat`.
- On success, append the user message and the returned `reply` as the assistant
  message, persist to `messages`, and return the same response shape the UI
  already expects (`{ message, conversation }`).
- `extractedData` / `currentState` columns are left untouched (no longer
  written). They stay in the schema; we simply stop updating them. No DB
  migration needed.
- Error handling: if the sidecar is unreachable or errors, return a friendly
  Arabic fallback message (mirrors the existing Gemini-failure message) and log
  the error. Do not 500 the UI.

### 4. Config
- New env var `AGENT_URL`, default `http://host.docker.internal:8000`.
- Document it in `.env.example`.
- `agent/requirements.txt` (or equivalent) gains `fastapi` and `uvicorn`.

## Data flow (one message)

1. UI sends user text to Node.
2. Node loads convo, checks active, runs `isOffTopic`.
3. If off-topic → save canned reply, return (unchanged behavior).
4. Else Node builds `history` from stored messages, POSTs `{message, history}`
   to the sidecar.
5. Sidecar runs `agent.run` → Gemma loops over tools → returns `{reply}`.
6. Node appends `user` + `assistant` messages, saves, returns to UI.

## Error handling

| Failure | Behavior |
|---|---|
| Sidecar down / timeout | Log error; return Arabic "technical error" fallback; HTTP 200 with fallback assistant message so the chat stays usable. |
| Agent returns empty reply | Substitute "أعد المحاولة من فضلك." (same as today's empty-Gemini guard). |
| Tool error inside agent | Already handled in `tools.run_tool` (returns `{error}`); the agent summarizes it in Arabic. |
| Off-topic | Local guardrail short-circuits before the sidecar (unchanged). |

## Out of scope (YAGNI)

- Property cards / structured results in the UI.
- Streaming responses.
- Docker-packaging Gemma or any production/cloud path.
- Auth between Node and the sidecar (local-only, trusted loopback).
- Rate limiting on the sidecar (Node already rate-limits the messages route).

## Running it (3 terminals + existing DB)

1. `python agent/server.py` (host, loads Gemma, serves :8000)
2. `docker compose up` (Postgres + Node api; Node reads `AGENT_URL`)
3. `pnpm --filter @workspace/web run dev` (web)

## Verification

- `GET http://localhost:8000/health` → `{"status":"ok"}`.
- Create a buyer conversation in the UI, ask for an apartment under a budget →
  agent replies in Arabic with matching listings (proves `search_properties`
  reached Postgres through the full chain).
- Ask to list a property → agent calls `create_listing`, row appears with
  `status = pending_review`.
- Stop the sidecar, send a message → UI shows the Arabic fallback, no crash.
