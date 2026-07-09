import helpers

def test_send_notification_delegates(monkeypatch):
    calls = {}
    monkeypatch.setattr(helpers.db, "insert_notification",
                        lambda user_id, message: calls.update(u=user_id, m=message) or {"id": "1", "status": "sent"})
    out = helpers.send_notification("user-1", "hi")
    assert out["status"] == "sent"
    assert calls == {"u": "user-1", "m": "hi"}

def test_get_owner_contact_delegates(monkeypatch):
    monkeypatch.setattr(helpers.db, "get_owner_contact",
                        lambda pid: {"id": "o1", "name": "Sami", "phone": "+962"})
    assert helpers.get_owner_contact("p1")["name"] == "Sami"

def test_allowed_helpers_lists_public_functions():
    assert set(helpers.ALLOWED_HELPERS) == {
        "search_properties", "get_property", "get_owner_contact",
        "create_listing", "send_notification",
    }
