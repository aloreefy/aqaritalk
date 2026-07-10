"""End-to-end proof: the creator subagent writes a `contact_owner` tool and the
stable dispatcher runs it against live Postgres — the same create-then-run path
the orchestrator drives in a single turn.

Guarded: needs live OpenAI (OPENAI_API_KEY) and Postgres (SKIP_DB_TESTS != "1").
generated_tools/ is redirected to a tmp dir so the run is repeatable and never
pollutes the real tool directory.
"""
import os
import pytest
import dispatcher

pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY") or os.getenv("SKIP_DB_TESTS") == "1",
    reason="needs OpenAI + Postgres",
)


def test_creator_writes_then_runs_a_tool(tmp_path, monkeypatch):
    # Isolate generated_tools so the test is repeatable
    d = tmp_path / "generated_tools"
    d.mkdir()
    monkeypatch.setattr(dispatcher, "GENERATED_DIR", str(d))

    # Directly exercise the create->run path the orchestrator uses
    from subagents.tool_creator import build_creator_agent
    creator = build_creator_agent()
    creator.invoke({"messages": [{"role": "user",
        "content": "اكتب أداة اسمها contact_owner تأخذ property_id و message "
                   "وترسل إشعاراً لصاحب العقار"}]})

    tools = [t["name"] for t in dispatcher.list_generated_tools()]
    assert "contact_owner" in tools, f"creator did not persist contact_owner; got {tools}"

    # Pick a real property and run the freshly written tool
    import db
    with db._connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM properties WHERE deleted_at IS NULL LIMIT 1")
        row = cur.fetchone()
    assert row is not None, "no non-deleted properties in the DB to test against"
    pid = str(row["id"])

    out = dispatcher.run_generated_tool("contact_owner", {"property_id": pid, "message": "مرحبا"})
    assert "error" not in out, f"generated tool errored: {out}"
