"""subagents/search.py — the buyer-side search subagent."""
from __future__ import annotations
from typing import Optional, Literal

from langchain.agents import create_agent
from langchain_core.tools import tool

import helpers

MODEL = "openai:gpt-4o-mini"

SEARCH_PROMPT = (
    "أنت وكيل بحث عقاري. استخدم أداة search_properties فور معرفتك المدينة أو "
    "نوع الصفقة. لخّص النتائج بالعربية بوضوح ولا تُكثر من الأسئلة."
)


@tool
def search_properties_tool(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    transaction_mode: Optional[Literal["sale", "rent", "lease"]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rooms: Optional[int] = None,
    limit: int = 5,
) -> dict:
    """ابحث عن العقارات النشطة المطابقة لمعايير المشتري."""
    return helpers.search_properties(
        city=city, property_type=property_type, transaction_mode=transaction_mode,
        min_price=min_price, max_price=max_price, min_rooms=min_rooms, limit=limit,
    )


def build_search_agent():
    return create_agent(model=MODEL, tools=[search_properties_tool], system_prompt=SEARCH_PROMPT)
