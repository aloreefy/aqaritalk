"""FastAPI sidecar: creates an OpenAI client once and serves the broker agent over HTTP.

The Node chat route forwards each message here instead of calling the model directly.

Run (DATABASE_URL and OPENAI_API_KEY must be set in the environment):
    cd agent
    python server.py            # serves 0.0.0.0:8000

Expose via ngrok so the Node API (running in Replit) can reach it:
    ngrok http 8000
Then set AGENT_URL in Replit Secrets to the ngrok HTTPS URL.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

import agent as agent_mod

HOST = os.environ.get("AGENT_HOST", "0.0.0.0")
PORT = int(os.environ.get("AGENT_PORT", "8000"))

_client: OpenAI = OpenAI()

logger = logging.getLogger(__name__)

app = FastAPI(title="AqariTalk broker agent")


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
    return {"status": "ok", "model": agent_mod.MODEL}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    history = [{"role": t.role, "content": t.content} for t in req.history]
    print(f"\n[chat] user: {req.message}", flush=True)
    try:
        reply = agent_mod.run(req.message, client=_client, history=history, verbose=True)
    except Exception as exc:
        logger.exception("agent.run failed")
        raise HTTPException(status_code=500, detail="agent error") from exc
    print(f"[chat] reply: {reply}", flush=True)
    return ChatResponse(reply=reply)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
