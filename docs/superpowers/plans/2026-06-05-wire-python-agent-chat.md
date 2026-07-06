# Wire Python Broker Agent into Chat UI — Implementation Plan

**Goal:** Replace the cloud-Gemini chat engine with the local Python broker agent (Gemma + 2 tools), connected via a persistent FastAPI sidecar.

**Architecture:** A FastAPI sidecar (`agent/server.py`) loads Gemma once and serves `POST /chat`. The Node route `POST /conversations/:id/messages` stops calling Gemini and the state machine; it keeps auth + the off-topic guardrail + persistence, and forwards `{message, history}` to the sidecar over HTTP.
