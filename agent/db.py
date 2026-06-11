"""Database access used by the broker agent's tools.

Calls the AqariTalk Node API (/api/internal/...) instead of Postgres directly,
so the agent can run anywhere — including a local Windows machine — without
needing a direct database connection.

Required env vars (set before running server.py):
  API_BASE_URL  — e.g. https://1f6524cd-...replit.dev
  INTERNAL_API_KEY — shared secret matching the server's INTERNAL_API_KEY
"""

from __future__ import annotations

import os
import json
import urllib.request

API_BASE_URL = os.environ.get("API_BASE_URL", "").rstrip("/")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _post(path: str, payload: dict) -> dict:
    url = f"{API_BASE_URL}/api/internal/{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Agent-Key": INTERNAL_API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        return {"error": f"HTTP {e.code}: {body}"}
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}


def search_properties(city=None, property_type=None, transaction_mode=None,
                      min_price=None, max_price=None, min_rooms=None, limit=5):
    """Return active listings matching the given filters."""
    payload = {"limit": limit}
    if city: payload["city"] = city
    if property_type: payload["property_type"] = property_type
    if transaction_mode: payload["transaction_mode"] = transaction_mode
    if min_price is not None: payload["min_price"] = min_price
    if max_price is not None: payload["max_price"] = max_price
    if min_rooms is not None: payload["min_rooms"] = min_rooms
    return _post("search-properties", payload)


def create_listing(property_type, transaction_mode, city, price,
                   district=None, rooms=None, area_sqm=None, description=None,
                   created_by=None):
    """Insert a new listing (status = pending_review)."""
    payload = {
        "property_type": property_type,
        "transaction_mode": transaction_mode,
        "city": city,
        "price": price,
    }
    if district is not None: payload["district"] = district
    if rooms is not None: payload["rooms"] = rooms
    if area_sqm is not None: payload["area_sqm"] = area_sqm
    if description is not None: payload["description"] = description
    return _post("create-listing", payload)
