"""
print_graph.py — show the compiled broker graph as a picture.

Run:  python print_graph.py

This imports the SAME `graph` object from broker_graph.py, so the
diagram is always generated from the real code (it can't drift).
Importing is safe even if llama-server / Postgres are offline — building
the graph makes no network calls.
"""
from broker_graph import graph

print("\n=== Mermaid (paste into mermaid.live to view) ===\n")
print(graph.get_graph().draw_mermaid())

print("\n=== ASCII (terminal view) ===\n")
try:
    print(graph.get_graph().draw_ascii())
except Exception as e:
    print(f"(ASCII needs `pip install grandalf` — skipped: {e})")
