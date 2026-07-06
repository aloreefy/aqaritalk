# Wire the Python broker agent into the chat UI

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** Local dev only

## Goal

Replace the cloud-Gemini conversation engine behind the chat UI with the local
Python broker agent (Gemma + 2 tools). No frontend changes; results are returned as plain Arabic text.

## Architecture

```
Chat UI → POST /api/conversations/:id/messages → Node route
                                                    │
                      POST http://<AGENT_URL>/v1/chat/completions
                      { messages, response_format: json_object }
                                                    │
                      llama.cpp server (Windows host via ngrok)
                      Gemma model (tool-calling loop in Node)
                                                    │
                      Arabic reply ←────────────────┘
```

## Decisions

- Python agent replaced by direct llama.cpp /v1/chat/completions calls from Node.
- Tool-calling loop (search_properties, create_listing) runs in Node.js.
- State machine dropped; agent owns conversation flow.
- Off-topic guardrail kept in Node (cheap local check before model call).
