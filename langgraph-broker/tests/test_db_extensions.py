import os
import pytest
import db

pytestmark = pytest.mark.skipif(
    os.getenv("SKIP_DB_TESTS") == "1",
    reason="requires local Postgres",
)


def _first_property_id():
    with db._connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM properties WHERE deleted_at IS NULL LIMIT 1")
        row = cur.fetchone()
    return str(row["id"]) if row else None


def test_get_property_returns_row():
    pid = _first_property_id()
    assert pid is not None
    prop = db.get_property(pid)
    assert prop is not None
    assert str(prop["id"]) == pid


def test_get_owner_contact_shape():
    pid = _first_property_id()
    contact = db.get_owner_contact(pid)
    assert contact is None or set(contact) >= {"id", "name", "phone"}


def test_insert_notification_returns_id():
    contact = db.get_owner_contact(_first_property_id())
    if not contact:
        pytest.skip("no owner to notify")
    result = db.insert_notification(contact["id"], "test message")
    assert result["status"] == "sent"
    assert result["id"]
