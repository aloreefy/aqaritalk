"""orchestrator.py — the supervisor coordinating the three subagents.

Permanent tools: call_search, call_listing, call_tool_creator, and the stable
dispatcher pair (list/run generated tools). property_ids surface from the search
subagent up to orchestrator state via Command, preserving the app's cards.
"""
from __future__ import annotations
from typing import Annotated, Optional

from langchain.agents import create_agent, AgentState
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.messages import ToolMessage
from langgraph.types import Command

import dispatcher
from subagents.search import build_search_agent
from subagents.listing import build_listing_agent
from subagents.tool_creator import build_creator_agent

MODEL = "openai:gpt-4o-mini"

_search_agent = build_search_agent()
_listing_agent = build_listing_agent()
_creator_agent = build_creator_agent()


class OrchestratorState(AgentState):
    property_ids: list[str]


def _last_text(result: dict) -> str:
    msgs = result.get("messages") or []
    return (getattr(msgs[-1], "content", "") if msgs else "") or "تم."


@tool
def call_search(
    query: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
    found_property_ids: Optional[list[str]] = None,
) -> Command:
    """فوّض بحث العقارات إلى وكيل البحث. مرّر طلب المستخدم كاملاً في query."""
    result = _search_agent.invoke({"messages": [{"role": "user", "content": query}]})
    ids = found_property_ids or _extract_ids(result)
    return Command(update={
        "property_ids": ids,
        "messages": [ToolMessage(content=_last_text(result), tool_call_id=tool_call_id)],
    })


def _extract_ids(result: dict) -> list[str]:
    import json
    from langchain_core.messages import ToolMessage as TM
    ids: list[str] = []
    for m in result.get("messages", []):
        if isinstance(m, TM):
            try:
                data = json.loads(m.content) if isinstance(m.content, str) else m.content
                found = [str(r["id"]) for r in data.get("results", []) if r.get("id")]
                if found:
                    ids = found
            except Exception:
                pass
    return ids


@tool
def call_listing(query: str) -> str:
    """فوّض إنشاء الإعلان إلى وكيل الإعلانات. مرّر طلب المستخدم كاملاً في query."""
    return _last_text(_listing_agent.invoke({"messages": [{"role": "user", "content": query}]}))


@tool
def call_tool_creator(need: str) -> str:
    """اطلب من مُنشئ الأدوات كتابة أداة جديدة تُلبّي الحاجة الموصوفة في need."""
    return _last_text(_creator_agent.invoke({"messages": [{"role": "user", "content": need}]}))


@tool
def list_generated_tools_tool() -> list[dict]:
    """اعرض الأدوات المُنشأة سابقاً المتاحة للاستخدام الآن."""
    return dispatcher.list_generated_tools()


@tool
def run_generated_tool_tool(name: str, tool_args: dict) -> dict:
    """شغّل أداة مُنشأة بالاسم name مع الوسائط tool_args.

    ملاحظة: المعامل يُسمّى tool_args لا args — تسمية معامل بالحرفية "args" في
    أداة مبنية بـ langchain_core.tools.tool تصطدم بآلية pydantic القديمة
    (ALT_V_ARGS = 'v__args' في pydantic.deprecated.decorator) التي تُعيد
    تسمية أي معامل باسم "args" داخلياً، فيفشل الاستدعاء بـ
    TypeError: got an unexpected keyword argument 'v__args'.
    """
    return dispatcher.run_generated_tool(name, tool_args)


ORCH_PROMPT = (
    "أنت المنسّق. لديك وكلاء: call_search للبحث، call_listing لإنشاء الإعلانات. "
    "قبل ابتكار أي قدرة جديدة استدعِ list_generated_tools_tool لترى إن كانت موجودة. "
    "إن لم توجد أداة مناسبة، استخدم call_tool_creator لكتابتها ثم شغّلها فوراً عبر "
    "run_generated_tool_tool في نفس الدور. رُدّ بالعربية."
)


def build_orchestrator():
    return create_agent(
        model=MODEL,
        tools=[call_search, call_listing, call_tool_creator,
               list_generated_tools_tool, run_generated_tool_tool],
        system_prompt=ORCH_PROMPT,
        state_schema=OrchestratorState,
    )
