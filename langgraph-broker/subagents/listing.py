"""subagents/listing.py — the seller-side listing subagent."""
from __future__ import annotations
from typing import Optional, Literal

from langchain.agents import create_agent
from langchain_core.tools import tool

import helpers

MODEL = "openai:gpt-4o-mini"

CREATE_PROMPT = (
    "أنت وكيل عقاري لإنشاء الإعلانات. لا تستدعِ create_listing_tool قبل معرفة "
    "نوع العقار ونوع الصفقة والمدينة والسعر بقيم حقيقية."
)


@tool
def create_listing_tool(
    property_type: str,
    transaction_mode: Literal["sale", "rent", "lease"],
    city: str,
    price: float,
    district: Optional[str] = None,
    rooms: Optional[int] = None,
    area_sqm: Optional[float] = None,
    description: Optional[str] = None,
) -> dict:
    """أنشئ إعلان عقار جديد بالحقول المطلوبة."""
    return helpers.create_listing(
        property_type=property_type, transaction_mode=transaction_mode, city=city,
        price=price, district=district, rooms=rooms, area_sqm=area_sqm, description=description,
    )


def build_listing_agent():
    return create_agent(model=MODEL, tools=[create_listing_tool], system_prompt=CREATE_PROMPT)
