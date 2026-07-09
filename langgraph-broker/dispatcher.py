"""dispatcher.py — the stable bridge to runtime-generated tools.

`save_generated_tool` validates then persists a tool as generated_tools/<name>.py.
`run_generated_tool` loads a saved tool fresh and runs it. Because these two
functions are permanent, newly written tools become usable in the same turn
without recompiling the orchestrator graph.
"""
from __future__ import annotations
import os
import re
import importlib.util

from validation import validate_generated_source, ValidationError  # noqa: F401 (re-exported for callers)

GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated_tools")

_SAFE_NAME = re.compile(r"^[a-z][a-z0-9_]{2,49}$")


def _path(name: str) -> str:
    return os.path.join(GENERATED_DIR, f"{name}.py")


def _load_module(name: str):
    spec = importlib.util.spec_from_file_location(f"generated_{name}", _path(name))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)   # runs the file; safe imports enforced at save time
    return module


def save_generated_tool(name: str, source: str) -> dict:
    if not _SAFE_NAME.match(name):
        raise ValueError(f"unsafe tool name: {name!r}")
    validate_generated_source(source)   # raises ValidationError on bad source
    os.makedirs(GENERATED_DIR, exist_ok=True)
    with open(_path(name), "w", encoding="utf-8") as f:
        f.write(source)
    return {"name": name, "path": _path(name)}


def list_generated_tools() -> list[dict]:
    if not os.path.isdir(GENERATED_DIR):
        return []
    out: list[dict] = []
    for fname in sorted(os.listdir(GENERATED_DIR)):
        if not fname.endswith(".py") or fname == "__init__.py":
            continue
        name = fname[:-3]
        try:
            meta = getattr(_load_module(name), "METADATA", None)
            if isinstance(meta, dict):
                out.append(meta)
        except Exception:
            continue
    return out


def run_generated_tool(name: str, args: dict) -> dict:
    if not _SAFE_NAME.match(name) or not os.path.exists(_path(name)):
        return {"error": f"no generated tool named {name!r}"}
    try:
        module = _load_module(name)
        return module.run(**(args or {}))
    except Exception as e:  # helper failure or bad args — report, don't crash the graph
        return {"error": f"{type(e).__name__}: {e}"}
