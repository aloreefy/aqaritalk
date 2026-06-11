"""Database access used by the broker agent's tools.

This is where the tools actually touch Postgres. `search_properties` reads;
`create_listing` writes. Kept separate from tools.py so the tool layer stays a
thin, readable schema + dispatch.

Note: for this local prototype `create_listing` writes straight to Postgres and
marks the row `pending_review`. In production this write should go through the
Node API (`POST /api/properties`) so it reuses the app's validation and status
rules.
"""

from __future__ import annotations

import os

import psycopg
from psycopg.rows import dict_row

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://aqaritalk:aqaritalk_dev@localhost:5432/aqaritalk",
)

# Arabic shadda (ـّ). We strip it on both sides when matching city/district so a
# user typing "عمان" still matches the stored "عمّان".
SHADDA = chr(0x0651)

VALID_TRANSACTION = {"sale", "rent", "lease"}
VALID_TYPES = {
    "apartment", "house", "floor", "building", "villa", "palace", "roof",
    "studio", "room", "office", "shop", "warehouse", "factory", "farm",
    "land_residential", "land_commercial", "land_agricultural", "hotel",
    "hospital", "clinic", "showroom", "mixed", "chalet", "rest_house", "other",
}


def _conn():
    return psycopg.connect(DB_URL, row_factory=dict_row)


def search_properties(city=None, property_type=None, transaction_mode=None,
                      min_price=None, max_price=None, min_rooms=None, limit=5):
    """Return active listings matching the given filters (cheapest first)."""
    clauses = ["status = 'active'", "deleted_at IS NULL"]
    params: list = []

    if city:
        clauses.append("REPLACE(city, %s, '') ILIKE '%%' || REPLACE(%s, %s, '') || '%%'")
        params += [SHADDA, city, SHADDA]
    if property_type:
        clauses.append("property_type = %s")
        params.append(property_type)
    if transaction_mode:
        clauses.append("transaction_mode = %s")
        params.append(transaction_mode)
    if min_price is not None:
        clauses.append("price >= %s")
        params.append(min_price)
    if max_price is not None:
        clauses.append("price <= %s")
        params.append(max_price)
    if min_rooms is not None:
        clauses.append("rooms >= %s")
        params.append(min_rooms)

    limit = max(1, min(int(limit or 5), 20))
    sql = (
        "SELECT id, listing_name, property_type, transaction_mode, city, district, "
        "price, price_currency, price_per, rooms, bathrooms, area_sqm, description "
        "FROM properties WHERE " + " AND ".join(clauses) +
        " ORDER BY price ASC LIMIT %s"
    )
    params.append(limit)

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    for r in rows:
        r["id"] = str(r["id"])
        if r.get("price") is not None:
            r["price"] = float(r["price"])
        if r.get("area_sqm") is not None:
            r["area_sqm"] = float(r["area_sqm"])
        if r.get("description"):
            r["description"] = r["description"][:160]
    return {"count": len(rows), "results": rows}


def _default_owner(cur):
    cur.execute("SELECT id FROM users WHERE role IN ('broker', 'seller') LIMIT 1")
    row = cur.fetchone()
    return row["id"] if row else None


def create_listing(property_type, transaction_mode, city, price,
                   district=None, rooms=None, area_sqm=None, description=None,
                   created_by=None):
    """Insert a new listing (status = pending_review). Returns the new id."""
    if property_type not in VALID_TYPES:
        return {"error": f"property_type غير صالح. اختر من: {sorted(VALID_TYPES)}"}
    if transaction_mode not in VALID_TRANSACTION:
        return {"error": f"transaction_mode يجب أن يكون: {sorted(VALID_TRANSACTION)}"}

    with _conn() as conn, conn.cursor() as cur:
        owner = created_by or _default_owner(cur)
        if owner is None:
            return {"error": "لا يوجد مستخدم لإسناد الإعلان إليه."}
        cur.execute(
            "INSERT INTO properties (created_by, listing_name, property_type, "
            "transaction_mode, city, district, price, rooms, area_sqm, "
            "description, status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending_review') RETURNING id",
            (owner, f"{property_type} - {city}", property_type, transaction_mode,
             city, district, price, rooms, area_sqm, description),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()

    return {"id": str(new_id), "status": "pending_review",
            "message": "تم إنشاء الإعلان بنجاح وهو الآن قيد المراجعة."}
