import pytest
import dispatcher
from validation import ValidationError

GOOD = '''
METADATA = {"name": "echo_tool", "description": "echoes", "params": {"value": "str"}}
def run(value: str) -> dict:
    return {"echoed": value}
'''

@pytest.fixture(autouse=True)
def temp_generated_dir(tmp_path, monkeypatch):
    d = tmp_path / "generated_tools"
    d.mkdir()
    monkeypatch.setattr(dispatcher, "GENERATED_DIR", str(d))

def test_save_and_run_roundtrip():
    dispatcher.save_generated_tool("echo_tool", GOOD)
    out = dispatcher.run_generated_tool("echo_tool", {"value": "hi"})
    assert out == {"echoed": "hi"}

def test_save_rejects_bad_source():
    with pytest.raises(ValidationError):
        dispatcher.save_generated_tool("bad", "import os\ndef run():\n    return {}")

def test_save_rejects_unsafe_name():
    with pytest.raises(ValueError):
        dispatcher.save_generated_tool("../escape", GOOD)

def test_list_returns_metadata():
    dispatcher.save_generated_tool("echo_tool", GOOD)
    listed = dispatcher.list_generated_tools()
    assert any(t["name"] == "echo_tool" for t in listed)

def test_run_missing_tool_returns_error():
    out = dispatcher.run_generated_tool("nope", {})
    assert "error" in out
