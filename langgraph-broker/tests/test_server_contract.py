import os
import pytest
import server

pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="importing server constructs the real orchestrator (needs OPENAI_API_KEY)",
)


def test_run_broker_returns_reply_and_ids(monkeypatch):
    class FakeOrch:
        def invoke(self, _):
            return {"messages": [type("M", (), {"content": "أهلاً"})()],
                    "property_ids": ["p1"]}
    monkeypatch.setattr(server, "_orchestrator", FakeOrch())
    out = server.run_broker([{"role": "user", "content": "مرحبا"}])
    assert out["reply"] == "أهلاً"
    assert out["property_ids"] == ["p1"]


def test_run_broker_empty_fallback(monkeypatch):
    class FakeOrch:
        def invoke(self, _):
            return {"messages": [], "property_ids": []}
    monkeypatch.setattr(server, "_orchestrator", FakeOrch())
    out = server.run_broker([{"role": "user", "content": "مرحبا"}])
    assert out["reply"] == "تم."
    assert out["property_ids"] == []
