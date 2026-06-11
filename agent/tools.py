"""The agent's tools.

A "tool" here is two things bundled together:
  1. a JSON-style schema (name + description + parameters) that tells the LLM
     what the tool does and how to call it, and
  2. a Python function (in db.py) that actually runs it.

`run_tool(name, args)` is what the agent loop calls once the model has decided
which tool to use.
"""

import db

TOOLS = [
    {
        "name": "search_properties",
        "description": (
            "ابحث عن العقارات المتاحة (النشطة) المطابقة لمعايير المشتري. "
            "استخدمها لاقتراح عقارات على من يريد الشراء أو الاستئجار."
        ),
        "parameters": {
            "city": "اسم المدينة بالعربية مثل: عمّان، إربد، الزرقاء (اختياري)",
            "property_type": "نوع العقار: apartment, villa, house, studio, "
                             "land_residential, office, shop ... (اختياري)",
            "transaction_mode": "نوع الصفقة: sale أو rent أو lease (اختياري)",
            "min_price": "أقل سعر بالدينار (اختياري)",
            "max_price": "أعلى سعر / الميزانية بالدينار (اختياري)",
            "min_rooms": "أقل عدد غرف نوم (اختياري)",
            "limit": "عدد النتائج المطلوبة (افتراضي 5)",
        },
    },
    {
        "name": "create_listing",
        "description": (
            "أنشئ إعلان عقار جديد في قاعدة البيانات. استخدمها عندما يرغب المالك "
            "أو الوسيط في عرض عقار للبيع أو الإيجار. الحقول property_type و "
            "transaction_mode و city و price مطلوبة."
        ),
        "parameters": {
            "property_type": "نوع العقار (مطلوب): apartment, villa, studio ...",
            "transaction_mode": "sale أو rent أو lease (مطلوب)",
            "city": "المدينة (مطلوب)",
            "price": "السعر بالدينار (مطلوب)",
            "district": "الحي أو المنطقة (اختياري)",
            "rooms": "عدد الغرف (اختياري)",
            "area_sqm": "المساحة بالمتر المربع (اختياري)",
            "description": "وصف نصي للعقار (اختياري)",
        },
    },
]

# Maps a tool name to the function that runs it.
_DISPATCH = {
    "search_properties": db.search_properties,
    "create_listing": db.create_listing,
}


def run_tool(name: str, args: dict):
    """Execute the tool the model chose, returning a JSON-serialisable result."""
    fn = _DISPATCH.get(name)
    if fn is None:
        return {"error": f"أداة غير معروفة: {name}"}
    try:
        return fn(**(args or {}))
    except TypeError as e:
        return {"error": f"معاملات غير صحيحة للأداة {name}: {e}"}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}
