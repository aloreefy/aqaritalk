import os
import pytest

from subagents import search, listing

NO_KEY = not os.getenv("OPENAI_API_KEY")


def test_search_tool_calls_helper(monkeypatch):
    monkeypatch.setattr(search.helpers, "search_properties",
                        lambda **kw: {"count": 1, "results": [{"id": "p1"}]})
    out = search.search_properties_tool.invoke({"city": "عمان"})
    assert out["count"] == 1


def test_listing_tool_calls_helper(monkeypatch):
    monkeypatch.setattr(listing.helpers, "create_listing",
                        lambda **kw: {"id": "p9", "status": "pending_review"})
    out = listing.create_listing_tool.invoke(
        {"property_type": "apartment", "transaction_mode": "rent", "city": "عمان", "price": 300})
    assert out["status"] == "pending_review"


@pytest.mark.skipif(NO_KEY, reason="requires OpenAI key")
def test_build_search_agent_is_callable():
    agent = search.build_search_agent()
    assert hasattr(agent, "invoke")


@pytest.mark.skipif(NO_KEY, reason="requires OpenAI key")
def test_build_listing_agent_is_callable():
    agent = listing.build_listing_agent()
    assert hasattr(agent, "invoke")
