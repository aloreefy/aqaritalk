"""FastAPI sidecar: loads Gemma ONCE and serves the broker agent over HTTP.

The Node chat route forwards each message here instead of calling Gemini.
Keeping the model resident avoids the ~20-40s reload per message you'd get
from spawning the CLI per request.

Run (on the Windows host, where the GGUF lives):
    cd agent
    python server.py            # serves 0.0.0.0:8000
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from llama_cpp import Llama

import agent as agent_mod

MODEL_PATH = os.environ.get("MODEL_PATH", agent_mod.MODEL_PATH)
HOST = os.environ.get("AGENT_HOST", "0.0.0.0")
PORT = int(os.environ.get("AGENT_PORT", "8000"))

# Loaded once at startup, reused for every request. Held at module level so the
# request handlers can reach it; populated by the lifespan handler below (not at
# import time, so importing this module doesn't require the GGUF to be present).
_llm: Llama | None = None

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _llm
    _llm = Llama(model_path=MODEL_PATH, n_ctx=4096,
                 n_threads=os.cpu_count(), verbose=False)
    yield


app = FastAPI(title="AqariTalk broker agent", lifespan=lifespan)


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
    print(f"\n[chat] user: {req.message}", flush=True)
    try:
        reply = agent_mod.run(req.message, model=_llm, history=history, verbose=True)
    except Exception as exc:  # noqa: BLE001 — surface as 500, Node renders the user fallback
        logger.exception("agent.run failed")
        raise HTTPException(status_code=500, detail="agent error") from exc
    print(f"[chat] reply: {reply}", flush=True)
    return ChatResponse(reply=reply)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
