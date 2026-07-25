"""
server.py — HTTP bridge that lets AqariTalk talk to the LangGraph broker.

AqariTalk's contract (the same one the Python agent / eve translator used):
    POST /chat   { "message": str, "history": [{"role", "content"}, ...] }  ->  { "reply": str }
    GET  /health -> { "ok": true }

The app is stateless toward us: it replays the last ~8 turns as `history` on
every call, so we just rebuild the graph's `messages` from history + the new
message and invoke the graph once.

Run:  python server.py            (listens on :8000, matching AGENT_URL)
"""
from __future__ import annotations
import os
import sys

from fastapi import FastAPI
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from broker_graph import graph, log   # the compiled graph + the tracing logger

app = FastAPI(title="AqariTalk LangGraph Broker")


class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Turn] = []


class ChatResponse(BaseModel):
    reply: str
    # Discriminated-union cards (docs/adr/0001):
    #   {"type": "properties", "propertyIds": [...]} | {"type": "contact", "contact": {...}}
    cards: list[dict] = []


def to_messages(req: ChatRequest) -> list[BaseMessage]:
    """Turn AqariTalk's {message, history} into LangChain messages.

    The current `message` goes LAST so the agent (which reads
    messages[-1]) sees the user's newest question.
    """
    msgs: list[BaseMessage] = []
    for turn in req.history:
        if turn.role == "assistant":
            msgs.append(AIMessage(turn.content))
        else:  # "user" (or anything else) is treated as a human turn
            msgs.append(HumanMessage(turn.content))
    msgs.append(HumanMessage(req.message))
    return msgs


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    # NOTE: sync `def` (not async) so FastAPI runs this in a threadpool and the
    # blocking graph.invoke() doesn't freeze the event loop.
    log("=" * 60)
    log(f"HTTP /chat — message: «{req.message}»  (history: {len(req.history)} turns)")
    cards: list[dict] = []
    try:
        result = graph.invoke({"messages": to_messages(req)})
        reply = result.get("reply") or "عذراً، لم أتمكن من معالجة طلبك."
        cards = result.get("cards") or []
    except Exception as e:  # never crash the app's chat; return a safe message
        log(f"❌ /chat error: {e!r}")
        reply = "عذراً، حدث خطأ تقني. حاول مرة أخرى."
    log(f"HTTP /chat — replying ({len(reply)} chars, {len(cards)} card(s))")
    return ChatResponse(reply=reply, cards=cards)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    print(f"AqariTalk LangGraph broker listening on http://127.0.0.1:{port}", file=sys.stderr)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
