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


def search_properties(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
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
        clauses.append(f"property_type = {p(property_type)}")
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
