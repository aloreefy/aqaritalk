"""
broker_graph.py — AqariTalk real-estate broker, built with LangGraph.

Flow:
    START -> classify -> (buy/sell -> agent ; unknown -> respond)
    agent -> (model called a tool? -> tools -> back to agent ; else -> respond)
    respond -> END

Run:  python broker_graph.py
Needs: pip install langgraph langchain-openai python-dotenv psycopg
       OPENAI_API_KEY + DATABASE_URL in .env (loaded below).
"""
from __future__ import annotations
import os
import sys
import json
from datetime import datetime
from typing import TypedDict, Literal, Optional, Annotated

import time
from dotenv import load_dotenv
load_dotenv()   # reads .env so OPENAI_API_KEY / DATABASE_URL are in the environment

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage, AIMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END      # the START/END sentinels
from langgraph.graph.message import add_messages         # the "append" reducer
from langgraph.prebuilt import ToolNode                   # runs tool calls for you

import db   # real Postgres access (db.py)


# ============================== 0. LOGGING ===============================
# Every interesting step prints to the screen AND appends to logs/broker.log,
# so we can watch tool-calling and looping happen "behind the curtains".
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "broker.log")


def log(msg: str) -> None:
    print(f"   [graph] {msg}", file=sys.stderr, flush=True)
    stamp = datetime.now().strftime("%H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{stamp} {msg}\n")


# ============================== 1. THE MODEL ==============================
# The model + temperature are read from the system_settings DB table on each
# request (cached for 5 minutes so settings changes don't require a restart).

_LLM_CACHE: dict = {"plain": None, "llm_with_tools": None, "max_turns": 10, "ts": 0.0}
_LLM_TTL = 300  # seconds — helpers defined after `tools` is declared below


# ============================== 2. THE TOOLS ==============================
# The function's DOCSTRING becomes the tool description the model sees.
# The type hints become the input schema. These call the real db.py.

@tool
def search_properties(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    transaction_mode: Optional[Literal["sale", "rent", "lease"]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rooms: Optional[int] = None,
    limit: int = 5,
) -> dict:
    """ابحث عن العقارات النشطة المطابقة لمعايير المشتري."""
    log(
        f"🔧 TOOL search_properties(city={city!r}, type={property_type!r}, "
        f"mode={transaction_mode!r}, max_price={max_price!r})"
    )
    result = db.search_properties(
        city=city,
        property_type=property_type,
        transaction_mode=transaction_mode,
        min_price=min_price,
        max_price=max_price,
        min_rooms=min_rooms,
        limit=limit,
    )
    log(f"🔧 TOOL search_properties → found {result.get('count', 0)} listing(s)")
    return result


@tool
def create_listing(
    property_type: str,
    transaction_mode: Literal["sale", "rent", "lease"],
    city: str,
    price: float,
    district: Optional[str] = None,
    rooms: Optional[int] = None,
    area_sqm: Optional[float] = None,
    description: Optional[str] = None,
) -> dict:
    """أنشئ إعلان عقار جديد. الحقول property_type و transaction_mode و city و price مطلوبة."""
    log(
        f"🔧 TOOL create_listing(type={property_type!r}, mode={transaction_mode!r}, "
        f"city={city!r}, price={price!r})"
    )
    result = db.create_listing(
        property_type=property_type,
        transaction_mode=transaction_mode,
        city=city,
        price=price,
        district=district,
        rooms=rooms,
        area_sqm=area_sqm,
        description=description,
    )
    log(f"🔧 TOOL create_listing → {result}")
    return result


tools = [search_properties, create_listing]

# Finish the LLM cache helper now that `tools` is in scope.
# Calling _get_llm_with_tools() returns the (possibly-refreshed) bound LLM
# and the current max_turns from DB.
def _get_llm_with_tools():
    now = time.time()
    if _LLM_CACHE["llm_with_tools"] is None or now - _LLM_CACHE["ts"] > _LLM_TTL:
        settings = db.get_system_settings()
        _llm = ChatOpenAI(
            model=settings["ai_model"],
            temperature=settings["ai_temperature"],
        )
        _LLM_CACHE["plain"] = _llm
        _LLM_CACHE["llm_with_tools"] = _llm.bind_tools(tools)
        _LLM_CACHE["max_turns"] = settings["ai_max_turns"]
        _LLM_CACHE["ts"] = now
        log(
            f"⚙️  LLM refreshed → model={settings['ai_model']}  "
            f"temp={settings['ai_temperature']}  max_turns={settings['ai_max_turns']}"
        )
    return _LLM_CACHE["llm_with_tools"], _LLM_CACHE["max_turns"]

def _get_plain_llm() -> ChatOpenAI:
    _get_llm_with_tools()          # triggers refresh if stale
    return _LLM_CACHE["plain"]


# ============================== 3. THE STATE ==============================
# This is the TypedDict every node reads and writes.
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]  # append, don't overwrite
    intent: Optional[Literal["buy", "sell", "unknown"]]
    reply: Optional[str]
    property_ids: Optional[list[str]]   # ids of the listings the search actually found


# ============================== 4. THE NODES ==============================
# A node = a function (state) -> partial state. Return ONLY the keys you
# changed; LangGraph merges them in (using each key's reducer).

def classify(state: AgentState) -> dict:
    """Classify the intent using the WHOLE conversation, not just the last line.

    A short follow-up like «اي شي» has no intent on its own — it inherits the
    intent of the conversation so far. So we hand the model a transcript of the
    last few turns and ask for one word.
    """
    msgs = state["messages"]
    last_text = msgs[-1].content if msgs else ""
    log(
        f"🧭 NODE classify: reading conversation "
        f"({len(msgs)} msg, last «{last_text}»)"
    )

    # Build a small transcript of the last 6 turns, labelled by speaker.
    lines = []
    for m in msgs[-6:]:
        who = "العميل" if isinstance(m, HumanMessage) else "الوكيل"
        lines.append(f"{who}: {m.content}")
    transcript = "\n".join(lines)

    verdict = _get_plain_llm().invoke([
        SystemMessage(
            "صنّف نية العميل بالنظر إلى المحادثة كاملةً، بكلمة واحدة فقط:\n"
            "buy إذا كان يريد الشراء أو الاستئجار،\n"
            "sell إذا كان يريد عرض عقار للبيع/الإيجار،\n"
            "unknown لأي شيء آخر (تحية أو سؤال عام).\n"
            "ملاحظة: الردود القصيرة مثل «اي شي» أو «ما بفرق» تتبع نية المحادثة "
            "السابقة، فلا تصنّفها unknown إذا كان السياق واضحاً.\n"
            "أعد الكلمة فقط."
        ),
        HumanMessage(transcript),
    ]).content.strip().lower()

    intent = "buy" if "buy" in verdict else "sell" if "sell" in verdict else "unknown"
    log(f"🧭 NODE classify: model said «{verdict}» → intent = {intent}")
    return {"intent": intent}


SEARCH_PROMPT = (
    "أنت وكيل عقاري محترف. العميل يريد الشراء أو الاستئجار. "
    "بمجرد أن تعرف المدينة أو نوع الصفقة (بيع/إيجار)، استدعِ أداة search_properties "
    "فوراً بما لديك من معايير — لا تُكثر من الأسئلة. "
    "إذا قال العميل «أي شيء» أو لم يحدّد تفضيلاً، ابحث بما هو متوفر لديك بدون "
    "طلب مزيد من التفاصيل. بعد الحصول على النتائج، لخّصها بالعربية بشكل واضح."
)
CREATE_PROMPT = (
    "أنت وكيل عقاري. العميل يريد عرض عقار. لا تستدعِ create_listing "
    "قبل أن تعرف نوع العقار ونوع الصفقة والمدينة والسعر بقيم حقيقية."
)


def agent(state: AgentState) -> dict:
    """The reasoning step. Intent decides which system prompt steers the model."""
    log(f"🤖 NODE agent: thinking (intent={state.get('intent')})...")

    llm_with_tools, max_turns = _get_llm_with_tools()

    # Enforce the admin-configured turn limit
    human_turns = sum(1 for m in state["messages"] if isinstance(m, HumanMessage))
    if human_turns > max_turns:
        log(f"🤖 NODE agent: max_turns ({max_turns}) exceeded — returning soft stop")
        return {"messages": [AIMessage(
            "لقد وصلنا إلى الحد الأقصى لهذه المحادثة. يرجى بدء محادثة جديدة."
        )]}

    system = SEARCH_PROMPT if state["intent"] == "buy" else CREATE_PROMPT
    response = llm_with_tools.invoke([SystemMessage(system), *state["messages"]])

    calls = getattr(response, "tool_calls", None)
    if calls:
        c = calls[0]
        log(f"🤖 NODE agent: decided to CALL {c['name']} with {c['args']}")
    else:
        log("🤖 NODE agent: produced a final answer (no tool needed)")
    return {"messages": [response]}   # append the model's reply (maybe with tool_calls)


def _collect_property_ids(messages: list[BaseMessage]) -> list[str]:
    """Pull the ids from the LAST search_properties tool result in the transcript.

    The search tool returns {"count", "results":[{"id",...}]} which the ToolNode
    stores as a ToolMessage. We surface those ids so the app can render cards.
    """
    ids: list[str] = []
    for m in messages:
        if isinstance(m, ToolMessage) and getattr(m, "name", "") == "search_properties":
            try:
                data = json.loads(m.content) if isinstance(m.content, str) else m.content
                found = [str(r["id"]) for r in data.get("results", []) if r.get("id")]
                if found:
                    ids = found   # keep the most recent search's results
            except Exception:
                pass
    return ids


def respond(state: AgentState) -> dict:
    """Produce the final Arabic text the app returns."""
    if state.get("intent") == "unknown":
        text = "مرحباً! أنا وكيل عقاري توك. بتدوّر على عقار للشراء/الإيجار، أو بدك تعرض عقار؟"
    else:
        text = state["messages"][-1].content or "تم."
    property_ids = _collect_property_ids(state["messages"])
    log(f"💬 NODE respond: final reply ready ({len(text)} chars, {len(property_ids)} card(s))")
    return {"reply": text, "property_ids": property_ids}


# ============================= 5. THE ROUTERS ============================
# Conditional-edge functions return the NAME of the next node.

def route_intent(state: AgentState) -> Literal["agent", "respond"]:
    if state["intent"] in ("buy", "sell"):
        log(f"↪️  ROUTER: intent={state['intent']} → go to 'agent'")
        return "agent"
    log("🏁 ROUTER: intent=unknown → go to 'respond'")
    return "respond"


def should_continue(state: AgentState) -> Literal["tools", "respond"]:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):   # model asked to call a tool
        log("↪️  ROUTER: tool requested → go to 'tools', then LOOP back to agent")
        return "tools"
    log("🏁 ROUTER: no tool requested → go to 'respond' (exit the loop)")
    return "respond"                         # model gave a plain answer -> finish


# ============================ 6. BUILD & COMPILE ==========================
builder = StateGraph(AgentState)

builder.add_node("classify", classify)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode(tools, handle_tool_errors=True))  # runs tool_calls
builder.add_node("respond", respond)

builder.add_edge(START, "classify")                         # entry point
# 3rd arg = the nodes this router is allowed to reach (lets LangGraph validate)
builder.add_conditional_edges("classify", route_intent, ["agent", "respond"])
builder.add_conditional_edges("agent", should_continue, ["tools", "respond"])
builder.add_edge("tools", "agent")                          # LOOP back to the LLM
builder.add_edge("respond", END)                            # exit point

graph = builder.compile()                                   # MUST compile before use


# ================================ 7. RUN ================================
if __name__ == "__main__":
    question = sys.argv[1] if len(sys.argv) > 1 else "بدي شقة للإيجار في عمّان بحدود 300 دينار"
    log("=" * 60)
    log(f"NEW RUN — question: «{question}»")
    result = graph.invoke({"messages": [HumanMessage(question)]})
    print("intent:", result["intent"])
    print("reply :", result["reply"])
