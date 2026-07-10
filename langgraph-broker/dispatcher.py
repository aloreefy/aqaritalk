"""dispatcher.py — the stable bridge to runtime-generated tools.

`save_generated_tool` validates then persists a tool as generated_tools/<name>.py.
`run_generated_tool` loads a saved tool fresh and runs it. Because these two
functions are permanent, newly written tools become usable in the same turn
without recompiling the orchestrator graph.
"""
from __future__ import annotations
import os
import re
import builtins as _builtins

from validation import validate_generated_source, ValidationError  # noqa: F401 (re-exported for callers)

GENERATED_DIR = os.path.join(os.path.dirname(__file__), "generated_tools")

_SAFE_NAME = re.compile(r"^[a-z][a-z0-9_]{2,49}$")

# The runtime containment boundary. Generated code executes with ONLY these
# builtins — no eval/exec/compile/open/input/getattr/setattr/delattr/vars/
# globals/locals/type/object/super/breakpoint and no raw __import__. Combined
# with the AST validator (which also blocks the `__builtins__[...]` bare-name
# escape), the outside world is reachable only through `helpers`. The AST gate
# is the first line; this restricted namespace is what actually contains
# adversarial LLM output if the gate is ever bypassed.
_SAFE_BUILTIN_NAMES = (
    "abs", "all", "any", "bool", "dict", "divmod", "enumerate", "filter",
    "float", "format", "frozenset", "int", "isinstance", "issubclass", "len",
    "list", "map", "max", "min", "print", "range", "repr", "reversed", "round",
    "set", "slice", "sorted", "str", "sum", "tuple", "zip",
)


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    """The only import a generated tool may perform: `from helpers import ...`.
    Anything else (os, sys, subprocess, ...) is refused."""
    if name == "helpers" and level == 0:
        import helpers  # the vetted capability surface
        return helpers
    raise ImportError(f"import of {name!r} is not permitted in generated tools")


def _safe_builtins() -> dict:
    safe = {n: getattr(_builtins, n) for n in _SAFE_BUILTIN_NAMES}
    safe["__import__"] = _safe_import   # so `from helpers import x` works, nothing else
    return safe


def _path(name: str) -> str:
    return os.path.join(GENERATED_DIR, f"{name}.py")


def _load_module(name: str) -> dict:
    """Execute a saved tool in a restricted namespace and return that namespace.

    Uses exec with a curated `__builtins__` rather than importlib, because
    importlib hands the module CPython's real builtins dict — reachable from
    generated code as `__builtins__["__import__"]("os")`. Here the only builtins
    that exist are the safe subset above.
    """
    with open(_path(name), "r", encoding="utf-8") as f:
        src = f.read()
    ns: dict = {"__builtins__": _safe_builtins(), "__name__": f"generated_{name}"}
    exec(compile(src, _path(name), "exec"), ns)   # contained by _safe_builtins()
    return ns


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
        if not _SAFE_NAME.match(name):   # never load a file whose name we wouldn't accept
            continue
        try:
            meta = _load_module(name).get("METADATA")
            if isinstance(meta, dict):
                out.append(meta)
        except Exception:
            continue
    return out


def run_generated_tool(name: str, args: dict) -> dict:
    if not _SAFE_NAME.match(name) or not os.path.exists(_path(name)):
        return {"error": f"no generated tool named {name!r}"}
    try:
        run = _load_module(name).get("run")
        if not callable(run):
            return {"error": f"generated tool {name!r} has no run() function"}
        return run(**(args or {}))
    except Exception as e:  # helper failure or bad args — report, don't crash the graph
        return {"error": f"{type(e).__name__}: {e}"}
