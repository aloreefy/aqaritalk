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
