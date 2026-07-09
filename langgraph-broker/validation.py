"""validation.py — enforce capability surface A on generated tool source.

A generated file is accepted only if it: parses, defines METADATA and a run()
function, imports nothing but `helpers`, and uses no dangerous builtins or
dunder-attribute escape hatches.
"""
from __future__ import annotations
import ast

from helpers import ALLOWED_HELPERS

FORBIDDEN_NAMES = {"eval", "exec", "open", "__import__", "compile", "globals", "locals", "vars", "getattr", "setattr"}


class ValidationError(Exception):
    pass


def validate_generated_source(source: str) -> None:
    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        raise ValidationError(f"syntax error: {e}") from e

    has_metadata = False
    has_run = False

    for node in ast.walk(tree):
        # Plain `import ...` is never allowed — `import helpers` would expose
        # `helpers.db` (and any other module-scope name) via attribute
        # traversal, reopening the sandbox escape. Only the canonical
        # `from helpers import <vetted name>` form is permitted.
        if isinstance(node, ast.Import):
            for alias in node.names:
                raise ValidationError(f"disallowed import: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if node.module != "helpers":
                raise ValidationError(f"disallowed import from: {node.module}")
            for alias in node.names:
                if alias.name not in ALLOWED_HELPERS:
                    raise ValidationError(f"disallowed helpers import: {alias.name}")
        # No dangerous builtins by name.
        elif isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            raise ValidationError(f"disallowed name: {node.id}")
        # No dunder attribute access (blocks .__class__.__bases__ tricks).
        elif isinstance(node, ast.Attribute) and node.attr.startswith("__") and node.attr.endswith("__"):
            raise ValidationError(f"disallowed dunder access: {node.attr}")
        # Track required top-level definitions.
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "METADATA":
                    has_metadata = True
        if isinstance(node, ast.FunctionDef) and node.name == "run":
            has_run = True

    if not has_metadata:
        raise ValidationError("missing METADATA")
    if not has_run:
        raise ValidationError("missing run() function")
