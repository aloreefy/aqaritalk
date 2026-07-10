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

from broker_graph import log   # the tracing logger (graph itself is retired; see run_broker)
from orchestrator import build_orchestrator

app = FastAPI(title="AqariTalk LangGraph Broker")

_orchestrator = build_orchestrator()


def run_broker(messages: list) -> dict:
    """Invoke the orchestrator with a list of messages and normalize its output.

    `messages` may be LangChain BaseMessage objects or role/content dicts — the
    orchestrator (create_agent's AgentState) accepts either.
    """
    result = _orchestrator.invoke({"messages": messages})
    msgs = result.get("messages") or []
    reply = (getattr(msgs[-1], "content", "") if msgs else "") or "تم."
    return {"reply": reply, "property_ids": result.get("property_ids") or []}


class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Turn] = []


class ChatResponse(BaseModel):
    reply: str
    propertyIds: list[str] = []


def to_messages(req: ChatRequest) -> list[BaseMessage]:
    """Turn AqariTalk's {message, history} into LangChain messages.

    The current `message` goes LAST so the graph's `classify` node (which reads
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
    # blocking run_broker() call doesn't freeze the event loop.
    log("=" * 60)
    log(f"HTTP /chat — message: «{req.message}»  (history: {len(req.history)} turns)")
    property_ids: list[str] = []
    try:
        result = run_broker(to_messages(req))
        reply = result.get("reply") or "عذراً، لم أتمكن من معالجة طلبك."
        property_ids = result.get("property_ids") or []
    except Exception as e:  # never crash the app's chat; return a safe message
        log(f"❌ /chat error: {e!r}")
        reply = "عذراً، حدث خطأ تقني. حاول مرة أخرى."
    log(f"HTTP /chat — replying ({len(reply)} chars, {len(property_ids)} card(s))")
    return ChatResponse(reply=reply, propertyIds=property_ids)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    print(f"AqariTalk LangGraph broker listening on http://127.0.0.1:{port}", file=sys.stderr)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
