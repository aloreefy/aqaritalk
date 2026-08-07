---
name: LangGraph broker LLM — DB-driven with 5-minute cache
description: The broker reads AI model/temperature/max_turns from system_settings and caches the result for 5 minutes; two helpers expose plain LLM (classify) and tool-bound LLM (agent node).
---

# LangGraph broker LLM — DB-driven with 5-minute cache

## The rule
Do not hardcode `model=` or `temperature=` in `broker_graph.py`. All inference settings come from `db.get_system_settings()` via a module-level `_LLM_CACHE` dict.

**Why:** Admin changes in the portal take effect without a broker restart, within the cache TTL.

**How to apply:**
- `_get_llm_with_tools()` — returns `(bound_llm, max_turns)`; call from the `agent` node.
- `_get_plain_llm()` — returns the base ChatOpenAI; call from the `classify` node.
- Both helpers are defined **after** `tools = [...]` is declared (they reference `tools` at call time).
- Cache TTL is 300 s (5 min); reduce if you need faster propagation.
- `db.get_system_settings()` is in `langgraph-broker/db.py`; falls back to safe defaults on DB error.
- `agent` node enforces `max_turns` by counting HumanMessage instances; responds with a soft Arabic stop message when exceeded.
