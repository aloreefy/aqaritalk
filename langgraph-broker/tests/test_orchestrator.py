import os
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="orchestrator import constructs OpenAI-backed subagents",
)

import orchestrator


def test_call_search_surfaces_property_ids(monkeypatch):
    class FakeAgent:
        def invoke(self, _):
            return {"messages": [type("M", (), {"content": "وجدت عقارين"})()],
                    "structured_output": None}
    monkeypatch.setattr(orchestrator, "_search_agent", FakeAgent())
    # search result path is surfaced from the fake helper result the tool reads
    monkeypatch.setattr(orchestrator.dispatcher, "list_generated_tools", lambda: [])
    # Tools with an InjectedToolCallId arg must be invoked with a full model
    # ToolCall dict (langchain_core requires this — a flat args dict raises
    # ValueError since tool_call_id has no source in a plain-args call).
    cmd = orchestrator.call_search.invoke({
        "args": {"query": "شقة للإيجار", "found_property_ids": ["p1", "p2"]},
        "name": "call_search",
        "type": "tool_call",
        "id": "call_1",
    })
    # call_search returns a Command updating property_ids
    assert cmd.update["property_ids"] == ["p1", "p2"]


def test_run_generated_tool_wrapper(monkeypatch):
    monkeypatch.setattr(orchestrator.dispatcher, "run_generated_tool",
                        lambda name, args: {"ok": name})
    # NOTE: the tool's dict param is named `tool_args`, not `args` — a
    # parameter literally named "args" collides with pydantic's deprecated
    # decorator machinery (ALT_V_ARGS = 'v__args') when langchain_core builds
    # the structured-tool schema, breaking invocation with a TypeError.
    out = orchestrator.run_generated_tool_tool.invoke({"name": "contact_owner", "tool_args": {}})
    assert out == {"ok": "contact_owner"}


def test_list_generated_tools_wrapper(monkeypatch):
    monkeypatch.setattr(orchestrator.dispatcher, "list_generated_tools",
                        lambda: [{"name": "contact_owner"}])
    out = orchestrator.list_generated_tools_tool.invoke({})
    assert out[0]["name"] == "contact_owner"


def test_build_orchestrator_is_callable():
    agent = orchestrator.build_orchestrator()
    assert hasattr(agent, "invoke")
