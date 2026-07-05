# book_property — a third agent tool (reserve a property, per-user)

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** Local dev. Builds on the agent-in-chat integration already shipped.

## Goal

Add a third tool to the broker agent: `book_property`. When a buyer decides on a
property, the agent reserves it — records a booking tied to the **real logged-in
user** and flips the property's status to `reserved` so it leaves the active pool.

## Decisions (locked)

- **Book only** (not "save"/bookmark — that's a separate future feature).
- **Per-user, real identity.** The booking is tied to the authenticated user; the
  user id is injected by the system, never supplied by the model.
- **Booking record:** a dedicated `bookings` table (not columns on `properties`),
  so bookings have their own history and lifecycle.
- **Only `active` properties are bookable.**

## Schema changes (require `db push`)

### 1. Extend the property status enum
Add `reserved` to `propertyStatusEnum` in `lib/db/src/schema/properties.ts`:
```
draft, pending_review, active, sold, rented, expired, rejected, deleted, reserved
```

### 2. New table `bookings` (`lib/db/src/schema/bookings.ts`)
| column | type | notes |
|---|---|---|
| `id` | uuid | primary key, default random |
| `property_id` | uuid | FK → `properties.id` |
| `user_id` | uuid | FK → `users.id` |
| `status` | `booking_status` enum [`reserved`, `cancelled`] | default `reserved` |
| `created_at` | timestamptz | default now |

Export the table + a new `bookingStatusEnum` from the schema barrel
(`lib/db/src/schema/index.ts`) so `@workspace/db` re-exports them.

## The tool

### `agent/db.py` — `book_property(property_id, user_id)`
Runs as a single transaction (all-or-nothing):
1. `SELECT status FROM properties WHERE id = property_id` → if no row, return
   `{"error": "العقار غير موجود."}`.
2. If status != `active`, return `{"error": "العقار غير متاح للحجز حالياً."}`
   (covers already-`reserved`, `sold`, `rented`, `draft`, etc.).
3. `INSERT INTO bookings (property_id, user_id, status) VALUES (..., 'reserved')`
   returning `id`.
4. `UPDATE properties SET status = 'reserved' WHERE id = property_id`.
5. `commit`. Return
   `{"booking_id": str, "status": "reserved", "message": "تم حجز العقار بنجاح."}`.
On any DB error, the transaction rolls back (no partial booking) and the error is
surfaced to the caller.

### `agent/tools.py` — schema + dispatch
Add a `book_property` entry to `TOOLS`. **The parameters schema exposes only
`property_id`** (the model must not control who books). Add `book_property` to
`_DISPATCH`.

The user id is injected, not modeled. Change `run_tool` to accept the acting
user and inject it for tools that need it:
```python
def run_tool(name, args, user_id=None):
    ...
    if name == "book_property":
        args = {**(args or {}), "user_id": user_id}
    return fn(**(args or {}))
```
If `user_id` is None when `book_property` is called, `db.book_property` returns
`{"error": "يجب تسجيل الدخول للحجز."}` (guard against an unauthenticated path).

## Identity plumbing (Node → sidecar → tool)

```
chat UI → Node POST /conversations/:id/messages   (req.user.userId known)
        → POST {AGENT_URL}/chat { message, history, user_id }   ← add user_id
        → server.py /chat → agent_mod.run(..., user_id=user_id)
        → agent.run(..., user_id=...) → run_tool(action, args, user_id)
        → book_property(property_id, user_id=<real user>)
```

Component changes:
- **`agent/server.py`:** `ChatRequest` gains `user_id: str | None = None`; `/chat`
  passes it to `agent_mod.run(..., user_id=req.user_id)`.
- **`agent/agent.py`:** `run(...)` gains `user_id=None`; passes it to every
  `run_tool(action, args, user_id)` call in the loop.
- **`artifacts/api-server/src/routes/conversations.ts`:** include
  `user_id: req.user!.userId` in the JSON body sent to the sidecar.

`search_properties` and `create_listing` ignore `user_id` (unchanged behavior).

## Data-flow constraint (accepted for v1)

Intra-loop tool results are not persisted across turns — only the final Arabic
reply is saved to `conversations.messages`. So in a later turn the model has no
property uuid from an earlier search. To book reliably the agent must, **within
the booking turn**, call `search_properties` (it still has the criteria in the
recent history window) to resolve the property and its id, then call
`book_property` with that id. This is multi-step and a bit slower, but needs no
new persistence. The system prompt guidance should make this explicit so the
model knows to look up the property before booking.

Future improvement (out of scope): persist last search results, or add property
cards with a "book" button, so the id is available directly.

## Error handling

| Case | Result |
|---|---|
| property missing | `{"error":"العقار غير موجود."}` → agent explains in Arabic |
| property not `active` | `{"error":"العقار غير متاح للحجز حالياً."}` |
| no user_id (unauthenticated) | `{"error":"يجب تسجيل الدخول للحجز."}` |
| DB failure | transaction rolls back; error string surfaced; agent shows a retry message |

## Out of scope (YAGNI)

- Save/bookmark feature and table.
- Cancel-booking tool (the `cancelled` enum value exists for future use only).
- Booking confirmation UI, notifications, or emails.
- Changing `create_listing` to use the real user as owner.
- Persisting search results across turns / property-card "book" button.

## Verification

- `db push` succeeds; `bookings` table + `reserved`/`booking_status` enums exist.
- Unit: `run_tool("book_property", {"property_id": "x"}, user_id="u")` calls
  `db.book_property` with `user_id="u"` injected (monkeypatch db, no real DB).
- Unit: `run_tool("book_property", {...}, user_id=None)` → `db.book_property`
  returns the login-required error.
- Live: via the sidecar, book an active seeded property → response has
  `status:"reserved"`; the `properties` row flips to `reserved`; a `bookings` row
  appears with the right user_id; a second booking attempt on the same property
  returns the "not available" error.
- Repo `typecheck` passes in Docker after the schema change + Node body change.
