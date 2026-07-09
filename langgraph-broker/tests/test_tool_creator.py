import os
import pytest

from subagents import tool_creator
from validation import ValidationError

NO_KEY = not os.getenv("OPENAI_API_KEY")


def test_write_tool_saves(monkeypatch):
    saved = {}
    monkeypatch.setattr(tool_creator.dispatcher, "save_generated_tool",
                        lambda name, source: saved.update(name=name, source=source) or {"name": name, "path": "x"})
    out = tool_creator.write_tool.invoke(
        {"name": "contact_owner", "description": "d", "source": "METADATA={}\ndef run():\n    return {}"})
    assert "contact_owner" in out
    assert saved["name"] == "contact_owner"


def test_write_tool_reports_validation_error(monkeypatch):
    def boom(name, source):
        raise ValidationError("disallowed import: os")
    monkeypatch.setattr(tool_creator.dispatcher, "save_generated_tool", boom)
    out = tool_creator.write_tool.invoke(
        {"name": "bad", "description": "d", "source": "import os"})
    assert "disallowed import" in out


@pytest.mark.skipif(NO_KEY, reason="requires OpenAI key")
def test_build_creator_agent_is_callable():
    agent = tool_creator.build_creator_agent()
    assert hasattr(agent, "invoke")
