# Design: Orchestrator + Subagents with Runtime Tool Creation

**Date:** 2026-07-07
**Component:** `langgraph-broker`
**Status:** Approved design — ready for implementation planning

## Summary

Redesign the AqariTalk broker from a single hand-wired LangGraph `StateGraph`
into a **supervisor (orchestrator) coordinating three subagents**, each built
with LangChain's prebuilt `create_agent()`:

1. **search agent** — finds active property listings.
2. **listing agent** — creates new listings.
3. **tool-creator agent** — writes a brand-new tool *at runtime* from the
   situational context, persists it, and makes it usable in the same turn.

This follows the official LangChain **Subagents / supervisor** pattern: a main
agent coordinates subagents by calling them as tools. It replaces the current
`classify → agent → tools → respond` graph in `broker_graph.py`.

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Multi-agent pattern | **Subagents / supervisor** (subagents invoked as tools) | Docs rate it ⭐⭐⭐⭐⭐ for multi-hop, parallelization, distributed dev; subagents report to the orchestrator, not the user |
| How each agent is built | **`create_agent()`** (prebuilt ReAct) for all four | ~1 line each vs. hand-wiring nodes/edges; still a ReAct loop |
| Subagent persistence | **Per-invocation** (`checkpointer=None`, default) | Recommended for multi-agent systems; fresh state per call, still supports interrupts |
| Model | **OpenAI `gpt-4o-mini`** | Matches existing `.env`; no change needed |
| Generated-tool capability surface | **A — curated helper library only** | Generated code may only call vetted building blocks; safe, readable, predictable |
| Generated-tool lifecycle | **Persist & reuse** to `generated_tools/` | Written once, reused across conversations and restarts |
| Making a new tool live | **Option 1 — stable dispatcher** (`list_generated_tools` + `run_generated_tool`) | Only approach that delivers same-turn "write a tool on the run" without recompiling the graph |
| Safety gate | **`interrupt()` approval + AST validation** | Approve before registering; AST check enforces helpers-only |

## Architecture

```
langgraph-broker/
  server.py                      FastAPI — unchanged I/O contract (messages in -> reply + property_ids out)
  orchestrator.py                the supervisor (create_agent)
      permanent tools:
        - call_search            -> search_agent   (create_agent)
        - call_listing           -> listing_agent  (create_agent)
        - call_tool_creator      -> creator_agent  (create_agent)
        - list_generated_tools() ┐  the stable dispatcher — never changes,
        - run_generated_tool()   ┘  so newly written tools need no recompile
  subagents/
      search.py                  wraps db.search_properties
      listing.py                 wraps db.create_listing
      tool_creator.py            writes new tools at runtime
  helpers.py                     the ONLY module generated code may import (capability surface A)
  dispatcher.py                  loads + runs files from generated_tools/
  generated_tools/               persisted *.py, one per created tool (survives restarts)
  db.py                          existing Postgres access (reused)
```

Every box (orchestrator + 3 subagents) is a `create_agent()` ReAct loop. Each
subagent keeps a **private message history** (different state schema from the
parent) and is invoked from inside a tool function — the standard supervisor
wiring. Only the subagent's final message returns to the orchestrator.

## Runtime tool-creation flow

Worked example — user asks to contact a property's owner
(*"تواصل مع صاحب هذا العقار"*), a capability no existing subagent covers:

1. Orchestrator calls `list_generated_tools()` -> `contact_owner` not present.
2. Orchestrator calls `call_tool_creator("a tool that sends a message to a property's owner")`.
3. **creator_agent** selects helper blocks (`get_owner_contact`,
   `send_notification`) and writes `generated_tools/contact_owner.py`.
4. **`interrupt()` approval gate** — "about to register `contact_owner` —
   approve?" (auto-approvable in dev).
5. **AST validation** passes -> file saved.
6. Orchestrator, **same turn**, calls
   `run_generated_tool("contact_owner", {property_id, message})`.
7. Result returns to the user.
8. **Next time**, step 1 finds the tool already exists — no re-creation.

## Generated-tool contract

Every generated file follows one fixed shape so the dispatcher can load it
without knowing anything about it in advance:

```python
# generated_tools/contact_owner.py
METADATA = {
    "name": "contact_owner",
    "description": "Send a message to the owner of a property",
    "params": {"property_id": "str", "message": "str"},
}

def run(property_id: str, message: str) -> dict:
    from helpers import get_owner_contact, send_notification   # helpers-only
    owner = get_owner_contact(property_id)
    return send_notification(owner["id"], message)
```

`run_generated_tool(name, args)` imports the module, reads `METADATA`, and calls
`run(**args)`. `list_generated_tools()` scans `generated_tools/` and returns each
file's `METADATA` so the orchestrator can discover what already exists.

## Safety — enforcing capability surface A

1. **AST check** on the written source *before* saving:
   - reject any `import` that is not `helpers` / `from helpers import ...`
   - reject `exec`, `eval`, `open`, `__import__`, and dunder attribute tricks
   - must define `METADATA` and a `run(...)` function
   - must `compile()` cleanly
   This is what *enforces* option A rather than merely trusting the prompt.
2. **`interrupt()` approval** before a file is registered.
3. Generated code reaches the database / outside world **only** through
   vetted helpers.

## Curated helper library (v1)

`helpers.py` — the drawer of safe parts the tool-creator may compose. Most
already exist in `db.py`; this re-exposes them in one stable, safe menu.

| Helper | Purpose |
|---|---|
| `search_properties(...)` | reuse `db.search_properties` |
| `get_property(property_id)` | fetch one listing |
| `get_owner_contact(property_id)` | owner id / name / phone |
| `create_listing(...)` | reuse `db.create_listing` |
| `send_notification(user_id, message)` | insert into `notifications` |

Deliberately small. The trade-off: the creator can only invent tools that are
**combinations of these parts**. A request needing something outside the drawer
(e.g. "send a WhatsApp") requires a human to add the helper first. That is the
price — and the point — of option A.

## Integration with the existing app

- `server.py` invokes `orchestrator` instead of `broker_graph.graph`, keeping
  the **same input/output contract** so the Node API is unchanged.
- **Property cards:** today `property_ids` are scraped from tool messages. With
  a subagent, the search runs *inside* `search_agent`, so `call_search` surfaces
  ids up to orchestrator state via `Command(update={"property_ids": ...})` — the
  documented "subagent outputs" pattern. Property cards keep working.
- `db.py` is reused as-is.

## Error handling

- Invalid generated code -> AST/compile validation fails -> creator retries or
  reports a clear error; nothing is registered.
- Unknown tool name in `run_generated_tool` -> dispatcher returns an error ->
  orchestrator may create the tool.
- Helper raises -> caught and returned as a tool error (the orchestrator can
  react rather than crash).

## Testing

- **Unit:** dispatcher loads and runs a known generated tool; AST validator
  rejects disallowed imports and dunder tricks; helper functions against a test
  database.
- **Integration:** full "contact owner" path — creator writes the file, the
  orchestrator runs it the same turn, a `notifications` row appears.
- **Regression:** existing search and listing flows still work end-to-end
  through the new orchestrator.

## Out of scope (v1)

- Widening the capability surface to raw DB access or full Python (options B/C).
- A recompile-based tool registry (option 2).
- Async / background subagents.
- Multi-turn (per-thread) subagent memory.
```
