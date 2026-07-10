"""subagents/tool_creator.py — writes new tools at runtime (capability surface A).

The agent composes tools from the curated helper library only. write_tool
validates and persists the source; the dispatcher makes it usable the same turn.
"""
from __future__ import annotations

import inspect

from langchain.agents import create_agent
from langchain_core.tools import tool

import dispatcher
import helpers
from validation import ValidationError

MODEL = "openai:gpt-4o-mini"


def _helper_reference() -> str:
    """One line per allowed helper: bare name + signature + summary, so the
    creator LLM knows exact params and return shapes (e.g. that
    get_owner_contact returns a dict and send_notification wants an id string,
    not the whole dict). Names are shown WITHOUT a `helpers.` prefix on purpose
    — see the import rule in CREATOR_PROMPT."""
    lines = []
    for name in helpers.ALLOWED_HELPERS:
        fn = getattr(helpers, name)
        summary = (inspect.getdoc(fn) or "").splitlines()[0]
        lines.append(f"- {name}{inspect.signature(fn)} — {summary}")
    return "\n".join(lines)


CREATOR_PROMPT = (
    "أنت مُنشئ أدوات. تكتب أداة بايثون جديدة بناءً على الحاجة. يجب أن يحتوي الملف "
    "على METADATA (name, description, params) ودالة run(...) تُعيد dict. "
    "قاعدة الاستيراد (إلزامية أمنياً): استورد الدوال التي تحتاجها فقط بهذه الصيغة "
    "'from helpers import اسم_الدالة, اسم_آخر' ثم نادِها مباشرةً بالاسم المجرّد "
    "بدون بادئة. ممنوع منعاً باتاً كتابة 'import helpers' أو استخدام البادئة "
    "'helpers.' (سيُرفض الكود). الدوال المسموح بها بتواقيعها وأشكال قيمها "
    "المُعادة:\n" + _helper_reference() + "\n"
    "انتبه لأشكال القيم المُعادة: مثلاً get_owner_contact تُعيد dict فيه المفتاح "
    "id، ومرّر هذا الـ id (وليس الـ dict كاملاً) إلى send_notification. "
    "استدعِ write_tool باسم الأداة ووصفها وكود المصدر كاملاً."
)


@tool
def write_tool(name: str, description: str, source: str) -> str:
    """اكتب أداة جديدة إلى المخزن. name اسم قصير، source كود بايثون كامل يستورد من helpers فقط."""
    try:
        result = dispatcher.save_generated_tool(name, source)
    except (ValidationError, ValueError) as e:
        return f"رُفضت الأداة: {e}"
    return f"تم إنشاء الأداة {result['name']} بنجاح وهي جاهزة للاستخدام."


def build_creator_agent():
    return create_agent(model=MODEL, tools=[write_tool], system_prompt=CREATOR_PROMPT)
