"""
broker_graph.py — AqariTalk real-estate broker, built with LangGraph.

Flow (single unified agent — no classifier):
    START -> agent -> (model called a tool? -> tools -> back to agent ; else -> respond)
    respond -> END

One system prompt covers buyers, sellers, and small talk; the model decides
what to do by choosing which tool to call (or none). A hard cap of
MAX_TOOL_ROUNDS tool rounds per user turn keeps the agent<->tools loop from
running away.

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

from dotenv import load_dotenv
load_dotenv()   # reads .env so OPENAI_API_KEY / DATABASE_URL are in the environment

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
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
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{stamp} {msg}\n")


def _fmt(obj, limit: int = 1500) -> str:
    """JSON-render any value for the log, truncated so one huge result can't flood it."""
    try:
        s = json.dumps(obj, ensure_ascii=False, default=str)
    except Exception:
        s = repr(obj)
    return s if len(s) <= limit else s[:limit] + f"… (+{len(s) - limit} chars truncated)"


def _describe_messages(msgs: list) -> str:
    """One line per message: who said what (truncated), so the LLM's exact input is visible."""
    lines = []
    for m in msgs:
        role = type(m).__name__.replace("Message", "")
        content = str(m.content).replace("\n", " ")
        if len(content) > 200:
            content = content[:200] + "…"
        lines.append(f"      [{role}] {content}")
    return "\n".join(lines)


# ============================== 1. THE MODEL ==============================
# gpt-4o-mini (cloud). The API key is read from OPENAI_API_KEY in .env — not
# hardcoded here. temperature=0.3 keeps tool calls reliable while letting the
# Arabic replies sound natural; max_tokens/timeout/max_retries bound cost and
# keep a hung OpenAI call from hanging the chat request.
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.3,
    max_tokens=1024,
    timeout=30,
    max_retries=2,
)


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
    args = {
        "city": city, "property_type": property_type,
        "transaction_mode": transaction_mode, "min_price": min_price,
        "max_price": max_price, "min_rooms": min_rooms, "limit": limit,
    }
    log(f"🔧 TOOL search_properties INPUT  ← {_fmt(args)}")
    result = db.search_properties(
        city=city,
        property_type=property_type,
        transaction_mode=transaction_mode,
        min_price=min_price,
        max_price=max_price,
        min_rooms=min_rooms,
        limit=limit,
    )
    log(f"🔧 TOOL search_properties OUTPUT → {result.get('count', 0)} listing(s): {_fmt(result)}")
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
    args = {
        "property_type": property_type, "transaction_mode": transaction_mode,
        "city": city, "price": price, "district": district,
        "rooms": rooms, "area_sqm": area_sqm, "description": description,
    }
    log(f"🔧 TOOL create_listing INPUT  ← {_fmt(args)}")
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
    log(f"🔧 TOOL create_listing OUTPUT → {_fmt(result)}")
    return result


@tool
def get_property_details(property_id: str) -> dict:
    """اعرض التفاصيل الكاملة لعقار واحد بمعرّفه (من نتائج بحث سابقة)."""
    log(f"🔧 TOOL get_property_details INPUT  ← {_fmt({'property_id': property_id})}")
    result = db.get_property_details(property_id)
    log(f"🔧 TOOL get_property_details OUTPUT → {_fmt(result)}")
    return result


# Company customer-service contact. Placeholders — swap real values in .env.
SUPPORT_CONTACT = {
    "phone": os.environ.get("SUPPORT_PHONE", "+962-6-XXX-XXXX"),
    "email": os.environ.get("SUPPORT_EMAIL", "support@aqaritalk.com"),
    "whatsapp": os.environ.get("SUPPORT_WHATSAPP", "+962-7X-XXX-XXXX"),
    "hours": os.environ.get("SUPPORT_HOURS", "السبت–الخميس 9:00–18:00"),
}


@tool
def get_contact_info() -> dict:
    """معلومات التواصل مع خدمة عملاء عقاري توك (وليس مالكي العقارات)."""
    log("🔧 TOOL get_contact_info INPUT  ← {}")
    log(f"🔧 TOOL get_contact_info OUTPUT → {_fmt(SUPPORT_CONTACT)}")
    return SUPPORT_CONTACT


tools = [search_properties, create_listing, get_property_details, get_contact_info]
llm_with_tools = llm.bind_tools(tools)   # gives the model the tool schemas


# ============================== 3. THE STATE ==============================
# This is the TypedDict every node reads and writes.
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]  # append, don't overwrite
    reply: Optional[str]
    cards: Optional[list[dict]]   # discriminated-union cards (see docs/adr/0001)


# ============================ 4. THE SYSTEM PROMPT ========================
# One prompt for everything: buyer search, seller listing, and small talk.
# The model routes itself by choosing a tool (or none) — no classifier node.
AGENT_PROMPT = (
    "أنت «وكيل عقاري توك»، وكيل عقارات محترف وودود يخدم العملاء بالعربية.\n"
    "\n"
    "قواعد سلوكك:\n"
    "1. عميل يريد الشراء أو الاستئجار: بمجرد أن تعرف المدينة أو نوع الصفقة "
    "(بيع/إيجار)، استدعِ أداة search_properties فوراً بما لديك من معايير — "
    "لا تُكثر من الأسئلة. إذا قال العميل «أي شيء» أو لم يحدد تفضيلاً، ابحث بما "
    "هو متوفر لديك دون طلب مزيد من التفاصيل. بعد الحصول على النتائج، لخّصها "
    "بالعربية بشكل واضح.\n"
    "2. عميل يريد عرض عقار للبيع أو التأجير: لا تستدعِ create_listing قبل أن "
    "تعرف نوع العقار ونوع الصفقة والمدينة والسعر بقيم حقيقية من العميل — "
    "اسأل عن الناقص فقط.\n"
    "3. رد على التحية والدردشة القصيرة بشكل طبيعي وودود، وقدّم نفسك كوكيل "
    "عقاري، ثم وجّه الحديث نحو احتياج العميل العقاري.\n"
    "4. مجالك العقارات فقط: إذا سأل العميل عن أي موضوع آخر، اعتذر بلطف "
    "وأعد توجيه الحديث إلى العقارات.\n"
    "5. إذا سأل العميل عن تفاصيل عقار ظهر في نتائج سابقة، استدعِ "
    "get_property_details بمعرّف ذلك العقار وأجب من بياناته.\n"
    "6. إذا طلب العميل التواصل مع خدمة العملاء أو الدعم، استدعِ get_contact_info.\n"
    "7. لا تعطِ أبداً رقم هاتف أو بريد مالك العقار ولا تعد بذلك — التواصل مع "
    "المالك يتم حصراً عبر زر «طلب التواصل مع المالك» في بطاقة العقار داخل التطبيق."
)

# Circuit breaker: max agent->tools laps per user turn before we force an exit.
MAX_TOOL_ROUNDS = 5

FALLBACK_REPLY = "عذراً، لم أتمكن من إكمال الطلب. حاول مرة أخرى أو أعد صياغة سؤالك."


# ============================== 5. THE NODES ==============================
# A node = a function (state) -> partial state. Return ONLY the keys you
# changed; LangGraph merges them in (using each key's reducer).

def agent(state: AgentState) -> dict:
    """The one reasoning step: sees the full history, decides tool vs. answer."""
    log(f"🤖 NODE agent: LLM INPUT ({len(state['messages'])} messages + system prompt):\n"
        f"{_describe_messages(state['messages'])}")
    response = llm_with_tools.invoke([SystemMessage(AGENT_PROMPT), *state["messages"]])

    calls = getattr(response, "tool_calls", None)
    if calls:
        for c in calls:
            log(f"🤖 NODE agent: LLM OUTPUT → CALL {c['name']} with args {_fmt(c['args'])}")
    else:
        log(f"🤖 NODE agent: LLM OUTPUT → final answer (no tool needed): «{_fmt(response.content, 600)}»")
    return {"messages": [response]}   # append the model's reply (maybe with tool_calls)


def _tool_rounds_this_turn(messages: list[BaseMessage]) -> int:
    """Count agent->tools laps since the latest user message."""
    rounds = 0
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            break
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            rounds += 1
    return rounds


def _collect_cards(messages: list[BaseMessage]) -> list[dict]:
    """Build the reply's cards from this run's tool results (see docs/adr/0001).

    ToolMessages only exist for the current request (history arrives as plain
    text turns), so scanning the whole transcript is scanning this turn.
    - search_properties → {"type": "properties", "propertyIds": [...]} (last search wins)
    - get_property_details → same card type with that single id
    - get_contact_info → {"type": "contact", "contact": {...}}
    """
    property_ids: list[str] = []
    contact: Optional[dict] = None
    for m in messages:
        if not isinstance(m, ToolMessage):
            continue
        try:
            data = json.loads(m.content) if isinstance(m.content, str) else m.content
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        name = getattr(m, "name", "")
        if name == "search_properties":
            found = [str(r["id"]) for r in data.get("results", []) if r.get("id")]
            if found:
                property_ids = found   # keep the most recent search's results
        elif name == "get_property_details" and data.get("id"):
            property_ids = [str(data["id"])]
        elif name == "get_contact_info":
            contact = data

    cards: list[dict] = []
    if property_ids:
        cards.append({"type": "properties", "propertyIds": property_ids})
    if contact:
        cards.append({"type": "contact", "contact": contact})
    return cards


def _last_ai_text(messages: list[BaseMessage]) -> str:
    """Newest AI message that actually contains text (skips tool-call-only ones)."""
    for m in reversed(messages):
        if isinstance(m, AIMessage) and m.content:
            return str(m.content)
    return ""


def respond(state: AgentState) -> dict:
    """Produce the final Arabic text + cards the app returns. No LLM work here."""
    text = _last_ai_text(state["messages"]) or FALLBACK_REPLY
    cards = _collect_cards(state["messages"])
    log(f"💬 NODE respond: final reply ({len(text)} chars, {len(cards)} card(s)): «{_fmt(text, 600)}»")
    if cards:
        log(f"💬 NODE respond: cards → {_fmt(cards, 600)}")
    return {"reply": text, "cards": cards}


# ============================= 6. THE ROUTER =============================
# Conditional-edge function: returns the NAME of the next node.

def should_continue(state: AgentState) -> Literal["tools", "respond"]:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):   # model asked to call a tool
        rounds = _tool_rounds_this_turn(state["messages"])
        if rounds > MAX_TOOL_ROUNDS:
            log(f"🛑 ROUTER: tool-round cap reached ({rounds} > {MAX_TOOL_ROUNDS}) → force 'respond'")
            return "respond"
        log(f"↪️  ROUTER: tool requested (round {rounds}/{MAX_TOOL_ROUNDS}) → go to 'tools', then LOOP back to agent")
        return "tools"
    log("🏁 ROUTER: no tool requested → go to 'respond' (exit the loop)")
    return "respond"                         # model gave a plain answer -> finish


# ============================ 7. BUILD & COMPILE ==========================
builder = StateGraph(AgentState)

builder.add_node("agent", agent)
builder.add_node("tools", ToolNode(tools, handle_tool_errors=True))  # runs tool_calls
builder.add_node("respond", respond)

builder.add_edge(START, "agent")                            # entry point
# 3rd arg = the nodes this router is allowed to reach (lets LangGraph validate)
builder.add_conditional_edges("agent", should_continue, ["tools", "respond"])
builder.add_edge("tools", "agent")                          # LOOP back to the LLM
builder.add_edge("respond", END)                            # exit point

graph = builder.compile()                                   # MUST compile before use


# ================================ 8. RUN ================================
if __name__ == "__main__":
    question = sys.argv[1] if len(sys.argv) > 1 else "بدي شقة للإيجار في عمّان بحدود 300 دينار"
    log("=" * 60)
    log(f"NEW RUN — question: «{question}»")
    result = graph.invoke({"messages": [HumanMessage(question)]})
    print("reply :", result["reply"])
    print("cards :", result["cards"])
