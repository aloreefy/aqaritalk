# AqariTalk

Arabic-first, mobile-first AI-guided real estate platform for Jordan and Saudi Arabia. Buyers and sellers converse with an AI broker that searches listings, creates listings, and mediates contact between parties.

## Language

**Broker**:
The LangGraph AI agent (Python sidecar) that handles chat: one unified LLM with tools, no classifier.
_Avoid_: chatbot, assistant, agent (ambiguous with "real-estate agent")

**Listing**:
A property offered on the platform, stored in Postgres. Created by sellers (via the broker or forms), searched by buyers.
_Avoid_: property (the physical asset), ad, post

**Card**:
A structured object the broker returns alongside its text reply, rendered by the app as a rich UI element (property card, contact card; later: booking card). Cards carry data, not prose.
_Avoid_: widget, attachment

**Card Contract**:
The agreed JSON shape of the `/chat` response that carries cards — the interface between broker and app.
_Avoid_: response format, payload schema

**Pre-selection Grid**:
Rows of tappable pill chips on the empty chat screen (deal type, property type, price band, rooms). Tapping chips composes an Arabic message into the chat input; the user sends it manually. Pure UI — no dedicated backend.
_Avoid_: filter bar, quick filters, tag table

**Chip**:
One tappable pill in the pre-selection grid representing a single search parameter value.
_Avoid_: tag, badge

**Contact Release**:
The existing dual-gated flow where buyer and seller each acknowledge commission terms before either sees the other's phone number.
_Avoid_: contact exchange, reveal

**Booking Composer** (deferred):
A future broker tool that assembles a transaction request as a card, plugging into Contact Release. Out of scope until its own design round.
_Avoid_: apply-now tool
