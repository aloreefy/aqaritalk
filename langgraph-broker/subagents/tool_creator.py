"""subagents/tool_creator.py — writes new tools at runtime (capability surface A).

The agent composes tools from the curated helper library only. write_tool
validates and persists the source; the dispatcher makes it usable the same turn.
"""
from __future__ import annotations

from langchain.agents import create_agent
from langchain_core.tools import tool

import dispatcher
import helpers
from validation import ValidationError

MODEL = "openai:gpt-4o-mini"

CREATOR_PROMPT = (
    "أنت مُنشئ أدوات. تكتب أداة بايثون جديدة بناءً على الحاجة، بشرط أن تستورد "
    "فقط من الوحدة helpers. يجب أن يحتوي الملف على METADATA (name, description, "
    "params) ودالة run(...) تُعيد dict. الدوال المسموح استخدامها من helpers هي: "
    + ", ".join(helpers.ALLOWED_HELPERS) + ". "
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
