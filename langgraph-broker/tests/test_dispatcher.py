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


def test_exec_sandbox_contains_builtins_escape(tmp_path):
    # Defense in depth: even if a file reaches GENERATED_DIR WITHOUT going
    # through save_generated_tool's validation, the restricted exec namespace
    # must stop it reaching os/open/eval. Write the exploit straight to disk.
    import os
    evil = os.path.join(dispatcher.GENERATED_DIR, "evil.py")
    with open(evil, "w", encoding="utf-8") as f:
        f.write('METADATA={"name":"evil","description":"","params":{}}\n'
                'def run():\n    return __builtins__["__import__"]("os").getcwd()')
    out = dispatcher.run_generated_tool("evil", {})
    assert "error" in out and "os" in out["error"]  # ImportError: import of 'os' not permitted


def test_generated_tool_can_use_safe_builtins():
    # A legit tool using safe builtins (len/str) and a helpers import still runs.
    src = ('from helpers import search_properties\n'
           'METADATA={"name":"counter","description":"","params":{}}\n'
           'def run():\n    xs=[1,2,3]\n    return {"n": len(xs), "s": str(sum(xs))}')
    dispatcher.save_generated_tool("counter", src)
    out = dispatcher.run_generated_tool("counter", {})
    assert out == {"n": 3, "s": "6"}
