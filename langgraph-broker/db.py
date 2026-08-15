"""
db.py — database access for the broker graph's tools.

Faithful Python port of the eve agent's `agent/lib/db.ts` (itself a port of the
original Python `agent/db.py`). `search_properties` reads; `create_listing`
writes (marking the row `pending_review`). Both talk to the same AqariTalk
Postgres the rest of the app uses, via DATABASE_URL.

Note: for this local prototype `create_listing` writes straight to Postgres. In
production this write should go through the Node API (POST /api/properties) so it
reuses the app's validation and status rules.
"""
from __future__ import annotations
import os
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://aqaritalk:aqaritalk_dev@localhost:5432/aqaritalk",
)

# Arabic shadda (ـّ). We strip it on both sides when matching city so a user
# typing "عمان" still matches the stored "عمّان".
SHADDA = "ّ"

VALID_TRANSACTION = {"sale", "rent", "lease"}
VALID_TYPES = {
    "apartment", "house", "floor", "building", "villa", "palace", "roof",
    "studio", "room", "office", "shop", "warehouse", "factory", "farm",
    "land_residential", "land_commercial", "land_agricultural", "hotel",
    "hospital", "clinic", "showroom", "mixed", "chalet", "rest_house", "other",
}


def _connect() -> psycopg.Connection:
    """Open a fresh connection per call (simple + safe for a prototype)."""
    return psycopg.connect(DB_URL, row_factory=dict_row)


# Words users (and the model) reach for that are NOT enum values, mapped to the
# enum values they mean. Without this, "land" reaches SQL and Postgres raises
# InvalidTextRepresentation against the property_type enum.
TYPE_ALIASES: dict[str, list[str]] = {
    "land": ["land_residential", "land_commercial", "land_agricultural"],
    "أرض": ["land_residential", "land_commercial", "land_agricultural"],
    "ارض": ["land_residential", "land_commercial", "land_agricultural"],
    "أراضي": ["land_residential", "land_commercial", "land_agricultural"],
    "اراضي": ["land_residential", "land_commercial", "land_agricultural"],
    "apartment_or_house": ["apartment", "house", "villa", "studio"],
}


def _normalize_types(value: Any) -> tuple[list[str], list[str]]:
    """Coerce whatever the model sent into valid enum values.

    Accepts a single string or a list. Expands aliases, drops anything that is
    not a real enum value, and de-duplicates while preserving order.
    Returns (valid_types, rejected_inputs).
    """
    if value is None:
        return [], []
    raw = [value] if isinstance(value, str) else list(value)

    valid: list[str] = []
    rejected: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            rejected.append(str(item))
            continue
        key = item.strip()
        expanded = TYPE_ALIASES.get(key, TYPE_ALIASES.get(key.lower(), [key]))
        for t in expanded:
            if t in VALID_TYPES:
                if t not in valid:
                    valid.append(t)
            else:
                rejected.append(t)
    return valid, rejected


def search_properties(
    city: Optional[str] = None,
    property_type: Optional[Any] = None,
    transaction_mode: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rooms: Optional[int] = None,
    limit: Optional[int] = 5,
) -> dict:
    clauses = ["status = 'active'", "deleted_at IS NULL"]
    params: list[Any] = []

    # Push a value, return its placeholder. psycopg uses %s positional params.
    def p(v: Any) -> str:
        params.append(v)
        return "%s"

    if city:
        # NOTE: literal % in the SQL is escaped as %% so psycopg doesn't read it
        # as a parameter marker.
        clauses.append(
            f"REPLACE(city, {p(SHADDA)}, '') ILIKE '%%' || "
            f"REPLACE({p(city)}, {p(SHADDA)}, '') || '%%'"
        )
    if property_type:
        types, rejected = _normalize_types(property_type)
        if not types:
            # Every value was unusable — tell the model what's valid instead of
            # letting an invalid enum literal blow up the query.
            return {
                "count": 0,
                "results": [],
                "error": (
                    f"أنواع عقارات غير صالحة: {', '.join(rejected)}. "
                    f"اختر من: {', '.join(sorted(VALID_TYPES))}"
                ),
            }
        clauses.append(f"property_type = ANY({p(types)}::property_type[])")
    if transaction_mode:
        clauses.append(f"transaction_mode = {p(transaction_mode)}")
    if min_price is not None:
        clauses.append(f"price >= {p(min_price)}")
    if max_price is not None:
        clauses.append(f"price <= {p(max_price)}")
    if min_rooms is not None:
        clauses.append(f"rooms >= {p(min_rooms)}")

    safe_limit = max(1, min(int(limit or 5), 20))

    sql = (
        "SELECT id, listing_name, property_type, transaction_mode, city, district, "
        "price, price_currency, price_per, rooms, bathrooms, area_sqm, description "
        f"FROM properties WHERE {' AND '.join(clauses)} "
        f"ORDER BY price ASC LIMIT {p(safe_limit)}"
    )

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        r["id"] = str(r["id"])
        # Postgres returns numeric/decimal as Decimal — coerce to float.
        if r.get("price") is not None:
            r["price"] = float(r["price"])
        if r.get("area_sqm") is not None:
            r["area_sqm"] = float(r["area_sqm"])
        if r.get("description"):
            r["description"] = str(r["description"])[:160]

    return {"count": len(rows), "results": rows}


def get_property_details(property_id: str) -> dict:
    """Full record for one listing, plus its image paths. Never owner contact —
    contact release is gated in the app (see docs/adr/0002)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, listing_name, listing_direction, property_type, "
            "transaction_mode, rental_period, price, price_currency, price_per, "
            "price_negotiable, country, city, district, rooms, bathrooms, "
            "living_rooms, area_sqm, land_area_sqm, floor_number, "
            "furnished_status, parking, has_elevator, has_garden, has_pool, "
            "has_basement, has_rooftop_access, building_age_years, condition, "
            "view_type, description, status, created_at "
            "FROM properties "
            "WHERE id = %s AND status = 'active' AND deleted_at IS NULL",
            [property_id],
        )
        row = cur.fetchone()
        if row is None:
            return {"error": "لم يتم العثور على العقار المطلوب."}
        cur.execute(
            "SELECT path FROM property_images WHERE property_id = %s "
            "AND is_voice_note = false ORDER BY created_at LIMIT 10",
            [property_id],
        )
        images = [r["path"] for r in cur.fetchall()]

    row["id"] = str(row["id"])
    for k in ("price", "area_sqm", "land_area_sqm"):
        if row.get(k) is not None:
            row[k] = float(row[k])
    if row.get("created_at") is not None:
        row["created_at"] = row["created_at"].isoformat()
    row["images"] = images
    return row


def _default_owner() -> Optional[str]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE role IN ('broker', 'seller') LIMIT 1"
        )
        row = cur.fetchone()
    return str(row["id"]) if row else None


def create_listing(
    property_type: str,
    transaction_mode: str,
    city: str,
    price: float,
    district: Optional[str] = None,
    rooms: Optional[int] = None,
    area_sqm: Optional[float] = None,
    description: Optional[str] = None,
    created_by: Optional[str] = None,
) -> dict:
    if property_type not in VALID_TYPES:
        return {"error": f"property_type غير صالح. اختر من: {', '.join(sorted(VALID_TYPES))}"}
    if transaction_mode not in VALID_TRANSACTION:
        return {"error": f"transaction_mode يجب أن يكون: {', '.join(sorted(VALID_TRANSACTION))}"}

    owner = created_by or _default_owner()
    if owner is None:
        return {"error": "لا يوجد مستخدم لإسناد الإعلان إليه."}

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO properties (created_by, listing_name, property_type, "
            "transaction_mode, city, district, price, rooms, area_sqm, "
            "description, status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending_review') RETURNING id",
            [
                owner,
                f"{property_type} - {city}",
                property_type,
                transaction_mode,
                city,
                district,
                price,
                rooms,
                area_sqm,
                description,
            ],
        )
        new_id = cur.fetchone()["id"]
        conn.commit()

    return {
        "id": str(new_id),
        "status": "pending_review",
        "message": "تم إنشاء الإعلان بنجاح وهو الآن قيد المراجعة.",
    }


def get_system_settings() -> dict:
    """Return AI/model settings from the system_settings table.

    Falls back to sane defaults if the table is empty or unavailable.
    """
    defaults = {
        "ai_model": "gpt-4o-mini",
        "ai_temperature": 0.0,
        "ai_max_turns": 10,
        "ai_guardrail_level": "balanced",
    }
    try:
        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT ai_model, ai_temperature, ai_max_turns, ai_guardrail_level "
                "FROM system_settings LIMIT 1"
            )
            row = cur.fetchone()
        if not row:
            return defaults
        return {
            "ai_model": row["ai_model"] or defaults["ai_model"],
            "ai_temperature": float(row["ai_temperature"] or 0.0),
            "ai_max_turns": int(row["ai_max_turns"] or 10),
            "ai_guardrail_level": row["ai_guardrail_level"] or defaults["ai_guardrail_level"],
        }
    except Exception as exc:
        import sys
        print(f"[db] get_system_settings failed: {exc}", file=sys.stderr)
        return defaults
