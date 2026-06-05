# Wire Python Broker Agent into Chat UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cloud-Gemini chat engine with the local Python broker agent (Gemma + 2 tools), connected via a persistent FastAPI sidecar.

**Architecture:** A FastAPI sidecar (`agent/server.py`) loads Gemma once and serves `POST /chat`. The Node route `POST /conversations/:id/messages` stops calling Gemini and the state machine; it keeps auth + the off-topic guardrail + persistence, and forwards `{message, history}` to the sidecar over HTTP. Node runs in Docker, the sidecar on the Windows host, so Node reaches it at `http://host.docker.internal:8000` (via the `AGENT_URL` env var).

**Tech Stack:** Python 3.14, `llama-cpp-python` (Gemma GGUF), FastAPI, uvicorn, pytest (new dev dep); Node 24 / Express 5 / TypeScript; Docker Compose.

---

## File Structure

- `agent/agent.py` (modify) — extract a pure `build_messages()` helper; add a `history` param to `run()`.
- `agent/server.py` (create) — FastAPI sidecar; loads Gemma once; `POST /chat`, `GET /health`.
- `agent/requirements.txt` (create) — pin the Python deps so the sidecar is reproducible.
- `agent/tests/test_build_messages.py` (create) — unit test for the only offline-testable logic (message assembly).
- `artifacts/api-server/src/routes/conversations.ts` (modify) — replace Gemini + state machine with a sidecar HTTP call.
- `docker-compose.yml` (modify) — pass `AGENT_URL` to the `api` service + add `host.docker.internal` mapping.
- `.env.example` (modify) — document `AGENT_URL`.

> **Note on testing:** This repo has no JS test runner (typecheck/build are the JS gates). For Python we add a single focused pytest on the pure message-assembly logic — the model-dependent and HTTP/Docker paths are verified by running them (commands given in each task).

---

## Task 1: Make agent message-assembly pure and history-aware

**Files:**
- Modify: `agent/agent.py`
- Create: `agent/tests/test_build_messages.py`
- Create: `agent/requirements.txt`

- [ ] **Step 1: Create `agent/requirements.txt`**

```
llama-cpp-python
fastapi
uvicorn
psycopg[binary]
pytest
```

- [ ] **Step 2: Write the failing test**

Create `agent/tests/test_build_messages.py`:

```python
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import build_messages


def test_no_history_folds_system_into_first_user_turn():
    msgs = build_messages("SYS", [], "hello")
    assert msgs == [{"role": "user", "content": "SYS\n\nرسالة المستخدم: hello"}]


def test_history_is_inserted_between_system_and_new_message():
    history = [
        {"role": "user", "content": "بدي شقة"},
        {"role": "assistant", "content": "في أي مدينة؟"},
    ]
    msgs = build_messages("SYS", history, "عمّان")
    # First turn carries the system prompt folded into the first user message.
    assert msgs[0] == {"role": "user", "content": "SYS\n\nرسالة المستخدم: بدي شقة"}
    # Then the assistant reply, then the new user message.
    assert msgs[1] == {"role": "assistant", "content": "في أي مدينة؟"}
    assert msgs[2] == {"role": "user", "content": "عمّان"}


def test_leading_assistant_history_is_dropped():
    # Gemma chat must start with a user turn; a leading greeting must be skipped.
    history = [
        {"role": "assistant", "content": "مرحباً!"},
        {"role": "user", "content": "بدي فيلا"},
    ]
    msgs = build_messages("SYS", history, "إربد")
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "SYS\n\nرسالة المستخدم: بدي فيلا"
    assert msgs[1] == {"role": "user", "content": "إربد"}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd agent && python -m pytest tests/test_build_messages.py -v`
Expected: FAIL — `ImportError: cannot import name 'build_messages'`.

- [ ] **Step 4: Implement `build_messages` and rewire `run()` in `agent/agent.py`**

Add this function above `run()`:

```python
def build_messages(system_prompt: str, history, user_message: str):
    """Assemble the message list Gemma sees.

    Gemma has no system role, so the system prompt is folded into the FIRST
    user turn. `history` is prior {role, content} turns (oldest first). Any
    leading assistant turns are dropped because the chat must start with a
    user turn. The new user_message is appended last.
    """
    turns = list(history or [])
    # Drop leading assistant turns (e.g. the stored greeting).
    while turns and turns[0]["role"] != "user":
        turns.pop(0)

    messages = []
    if turns:
        first = turns[0]
        messages.append({
            "role": "user",
            "content": system_prompt + "\n\nرسالة المستخدم: " + first["content"],
        })
        for t in turns[1:]:
            messages.append({"role": t["role"], "content": t["content"]})
        messages.append({"role": "user", "content": user_message})
    else:
        messages.append({
            "role": "user",
            "content": system_prompt + "\n\nرسالة المستخدم: " + user_message,
        })
    return messages
```

Then change `run()` to take `history` and use the helper. Replace the existing
signature and the inline `messages = [...]` block:

```python
def run(user_message: str, model: Llama | None = None, history=None,
        max_steps: int = 5, verbose: bool = False) -> str:
    llm = model or Llama(model_path=MODEL_PATH, n_ctx=4096,
                         n_threads=os.cpu_count(), verbose=False)

    messages = build_messages(build_system_prompt(), history, user_message)

    for _ in range(max_steps):
        # ... unchanged loop body ...
```

Leave the rest of the loop body unchanged.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd agent && python -m pytest tests/test_build_messages.py -v`
Expected: PASS (3 passed).

- [ ] **Step 6: Verify the CLI still works (history defaults to None)**

Run: `cd agent && python agent.py "بدي شقة للإيجار في عمّان بأقل من 500 دينار"`
Expected: prints a tool call then an Arabic reply (model loads once for this run).

- [ ] **Step 7: Commit**

```bash
git add agent/agent.py agent/tests/test_build_messages.py agent/requirements.txt
git commit -m "feat(agent): history-aware message assembly + requirements"
```

---

## Task 2: FastAPI sidecar that keeps Gemma hot

**Files:**
- Create: `agent/server.py`

- [ ] **Step 1: Write `agent/server.py`**

```python
"""FastAPI sidecar: loads Gemma ONCE and serves the broker agent over HTTP.

The Node chat route forwards each message here instead of calling Gemini.
Keeping the model resident avoids the ~20-40s reload per message you'd get
from spawning the CLI per request.

Run (on the Windows host, where the GGUF lives):
    cd agent
    python server.py            # serves 0.0.0.0:8000
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from pydantic import BaseModel
from llama_cpp import Llama

import agent as agent_mod

MODEL_PATH = os.environ.get("MODEL_PATH", agent_mod.MODEL_PATH)
HOST = os.environ.get("AGENT_HOST", "0.0.0.0")
PORT = int(os.environ.get("AGENT_PORT", "8000"))

app = FastAPI(title="AqariTalk broker agent")

# Loaded once at import/startup; reused for every request.
_llm = Llama(model_path=MODEL_PATH, n_ctx=4096,
             n_threads=os.cpu_count(), verbose=False)


class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Turn] = []


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    history = [{"role": t.role, "content": t.content} for t in req.history]
    reply = agent_mod.run(req.message, model=_llm, history=history, verbose=False)
    return ChatResponse(reply=reply)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
```

- [ ] **Step 2: Start the sidecar**

Run: `cd agent && python server.py`
Expected: llama.cpp load logs, then `Uvicorn running on http://0.0.0.0:8000`.

- [ ] **Step 3: Verify health (second terminal)**

Run: `curl http://localhost:8000/health`
Expected: `{"status":"ok"}`.

- [ ] **Step 4: Verify /chat end to end (Postgres must be up)**

Run:
```bash
curl -s -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"message\":\"بدي شقة للايجار في عمان باقل من 500 دينار\",\"history\":[]}"
```
Expected: JSON `{"reply":"..."}` with an Arabic reply mentioning matching listings.

- [ ] **Step 5: Verify multi-turn memory**

Run:
```bash
curl -s -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"message\":\"عمان\",\"history\":[{\"role\":\"user\",\"content\":\"بدي شقة\"},{\"role\":\"assistant\",\"content\":\"في اي مدينة؟\"}]}"
```
Expected: reply treats "عمان" as the city answer (not a fresh start), proving history is used.

- [ ] **Step 6: Commit**

```bash
git add agent/server.py
git commit -m "feat(agent): FastAPI sidecar serving the broker agent on :8000"
```

---

## Task 3: Point Node at the sidecar (config)

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Add `AGENT_URL` + host mapping to the `api` service in `docker-compose.yml`**

In the `api:` service, add to `environment:` (after `SESSION_SECRET`):

```yaml
      AGENT_URL: ${AGENT_URL:-http://host.docker.internal:8000}
```

And add this block to the `api:` service (sibling of `environment:`), so Linux
Docker also resolves the host (Docker Desktop/Windows already does, this makes
it portable):

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

- [ ] **Step 2: Document `AGENT_URL` in `.env.example`**

Append:

```
# ── Broker agent sidecar ────────────────────────────────────────────────────
# URL the Node API uses to reach the Python agent (agent/server.py).
# Node runs in Docker and the sidecar on the host, so use host.docker.internal.
AGENT_URL=http://host.docker.internal:8000
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: wire AGENT_URL for the Node->sidecar bridge"
```

---

## Task 4: Replace Gemini + state machine in the chat route

**Files:**
- Modify: `artifacts/api-server/src/routes/conversations.ts`

- [ ] **Step 1: Trim now-unused imports**

In `conversations.ts`, remove these imports (lines ~14-25):

```ts
import { createChat, type ChatHistory } from "../services/ai/client";
import { buildSystemPrompt } from "../services/ai/context-builder";
import { extractBuyerCriteria, extractSellerData, isSubmitIntent } from "../services/ai/extraction";
import {
  advanceBuyerState,
  advanceSellerState,
  type BuyerState,
  type SellerState,
  type BuyerCriteria,
  type SellerData,
} from "../services/ai/state-machine";
```

Keep the guardrail import:

```ts
import { isOffTopic, OFF_TOPIC_RESPONSE_AR } from "../services/ai/guardrails";
```

Re-add `SellerData` where `submit-listing` still needs it — change the line to:

```ts
import type { SellerData } from "../services/ai/state-machine";
```

(Place this `import type` near the other imports. `submit-listing` below still
uses `SellerData`; nothing else from state-machine is needed.)

- [ ] **Step 2: Add the sidecar URL constant**

Below the imports, add:

```ts
const AGENT_URL = process.env.AGENT_URL ?? "http://host.docker.internal:8000";
```

- [ ] **Step 3: Replace the message-handler body (the extract/state/Gemini section)**

In `POST /conversations/:id/messages`, **replace everything** from the
`// --- Extract & advance state ---` comment down to the construction of
`updatedMessages` (i.e. the extraction block, the `buildSystemPrompt`/`createChat`
Gemini block, and the `aiMsg` build) with:

```ts
    // --- Build history for the agent (drop timestamps) ---
    const existingMessages = (convo.messages as Message[]) ?? [];
    const history = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: Message = {
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };

    // --- Call the Python broker-agent sidecar ---
    let aiText = "";
    try {
      const resp = await fetch(`${AGENT_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
      });
      if (!resp.ok) throw new Error(`agent sidecar HTTP ${resp.status}`);
      const data = (await resp.json()) as { reply?: string };
      aiText = (data.reply ?? "").trim();
      if (!aiText) aiText = "أعد المحاولة من فضلك.";
    } catch (err) {
      req.log.error({ err }, "Agent sidecar call failed");
      aiText = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.";
    }

    const aiMsg: Message = {
      role: "assistant",
      content: aiText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...existingMessages, userMsg, aiMsg];
```

- [ ] **Step 4: Stop writing the dropped state columns**

Replace the `.set({...})` in this handler's `db.update(...)` so it no longer
writes `extractedData` / `currentState`:

```ts
    const [updated] = await db
      .update(conversationsTable)
      .set({
        messages: updatedMessages,
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, convo.id))
      .returning();
```

(Leave the `submit-listing` handler below untouched — it still reads
`extractedData` for any older conversations and uses `SellerData`.)

- [ ] **Step 5: Typecheck the API package**

Run: `pnpm --filter @workspace/api-server run typecheck`
Expected: no errors. If it flags an unused symbol, remove that leftover import.

> If `pnpm` can't run natively on Windows (preinstall guard), run the typecheck in Docker:
> `docker compose run --rm --no-deps api pnpm --filter @workspace/api-server run typecheck`

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/conversations.ts
git commit -m "feat(api): route chat messages to the broker-agent sidecar"
```

---

## Task 5: Full-stack smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start the three processes**

Terminal 1 (host): `cd agent && python server.py`
Terminal 2: `docker compose up` (Postgres + api)
Terminal 3: `pnpm --filter @workspace/web run dev`

- [ ] **Step 2: Confirm Node can reach the sidecar from inside Docker**

Run: `docker compose exec api node -e "fetch('http://host.docker.internal:8000/health').then(r=>r.json()).then(j=>console.log(j)).catch(e=>{console.error(e);process.exit(1)})"`
Expected: prints `{ status: 'ok' }`.

- [ ] **Step 3: Buyer flow in the UI**

Open the web app, start a buyer conversation, ask:
`بدي شقة للإيجار في عمّان بأقل من 500 دينار`
Expected: agent replies in Arabic listing matching properties (proves
`search_properties` ran through the whole chain).

- [ ] **Step 4: Multi-turn memory in the UI**

Send a follow-up like `وكم غرفة فيها؟` referencing the prior result.
Expected: the reply stays on-topic about the just-listed properties (history works).

- [ ] **Step 5: Sidecar-down fallback**

Stop Terminal 1 (Ctrl-C), send another chat message.
Expected: UI shows `عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.` — no crash, HTTP 200.

- [ ] **Step 6: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: verify broker-agent chat integration end to end"
```

---

## Self-Review Notes

- **Spec coverage:** sidecar (Task 2), history param (Task 1), conversations.ts rewrite + guardrail kept + columns untouched (Task 4), AGENT_URL/host.docker.internal + .env.example (Task 3), error fallback (Task 4 Step 3), verification incl. sidecar-down (Task 5). All spec sections mapped.
- **Types:** `build_messages(system_prompt, history, user_message)` and `run(..., history=None, ...)` consistent across Tasks 1–2; `{role, content}` turn shape consistent Python↔Node (Task 1, 2, 4).
- **No placeholders:** every code/command step is concrete.
