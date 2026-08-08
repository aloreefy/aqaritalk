# Admin Portal — UI/UX Rules

These rules apply to **every data module** in the admin portal (Users, Listings, and any future page).
They were established during the initial portal build and must be respected by all new pages.

---

## 1. Page Structure — Two Sub-pages Per Module

Every data module must expose exactly three route segments:

| Route pattern | Purpose |
|---|---|
| `/module` | List page (Table or Card view) |
| `/module/new` | Create form |
| `/module/:id` | Preview (read-only detail) |
| `/module/:id/edit` | Edit form |

**No dialogs for data entry.** All create and edit operations happen on dedicated full pages.

---

## 2. View Modes — Table and Card

The list page must support two view modes toggled by an icon button pair in the header:

- **Table view** — traditional data grid with sortable columns
- **Card view** — responsive grid of summary cards (useful for image-heavy data like listings)

The active mode is stored in component state (no persistence required).

---

## 3. Pagination

- Pagination controls appear at the **bottom** of the list page.
- A **dropdown** lets the operator choose page size: **10 / 25 / 50 / 100** items.
- Show current range and total count: `Showing 1–25 of 143 items`.
- Previous / Next buttons; page number indicator.

---

## 4. Row / Card Click → Preview

Clicking anywhere on a table row or a card navigates to the **Preview page** (`/module/:id`).
This is separate from the Edit action — preview is always read-only.

---

## 5. Actions Column (Table) / Actions Menu (Card)

Every row and every card exposes three icon actions:

| Icon | Action | Behaviour |
|---|---|---|
| 👁 Eye | **View** | Navigate to `/module/:id` (Preview) |
| ✏️ Pencil | **Edit** | Navigate to `/module/:id/edit` |
| 🗑 Trash | **Delete** | Soft-delete with confirmation guard (see rule 7–8) |

---

## 6. Soft-Delete Only

All delete operations are **soft-deletes** — the record is never physically removed from the database.
A `deleted_at` or `status = 'deleted'` field marks the record as deleted.
Deleted records are hidden from the default list view but remain queryable via a filter.

---

## 7. Delete Confirmation Guard

Every delete action must show a **Yes / No confirmation** before proceeding.
Use a native `AlertDialog` (shadcn component) — not a browser `confirm()`.
The dialog must name the specific item being deleted so the operator knows exactly what they're confirming.

---

## 8. Filters

Every list page includes a filter bar appropriate to its data:

### Users filters
- Search (name or phone number)
- Role: All / Buyer / Seller / Broker / Admin
- Status: All / Active / Restricted / Suspended / Banned

### Listings filters
- Search (listing name, ID, city)
- Type: All / Apartment / Villa / Land / Commercial / etc.
- Transaction mode: All / Sale / Rent / Lease
- Status: All / Active / Pending Review / Rejected / Deleted

---

## 9. User Status Levels

User accounts use a 4-level escalating severity scale:

| Status | Can log in | Can post | Can chat | Use case |
|---|---|---|---|---|
| **Active** | ✅ | ✅ | ✅ | Normal operation |
| **Restricted** | ✅ | ❌ | ❌ | First offence — bad content, spam |
| **Suspended** | ❌ | ❌ | ❌ | Serious / repeated violations — temporary |
| **Banned** | ❌ | ❌ | ❌ | Permanent — nuclear option |

The API server enforces Restricted/Suspended/Banned at the auth middleware level.

---

## 10. User Fields — Admin-Editable vs Read-Only

| Field | Editable | Notes |
|---|---|---|
| Name | ✅ | Display name correction |
| Role | ✅ | buyer / seller / broker / admin |
| Status | ✅ | Active / Restricted / Suspended / Banned |
| City / Market | ✅ | Regional assignment |
| Phone | ❌ read-only | Auth credential — changing it would lock the user out |

Admins **can create users from scratch** (bypasses OTP — intended for broker onboarding).

---

## 11. Listing Status — Admin vs Seller Create

| Created by | Default status |
|---|---|
| Seller (via app) | `pending_review` |
| Admin (via portal) | `active` (admin is the reviewer) |

---

## 12. New/Edit Form Conventions

- Use the shared `Form` + `FormField` + `FormControl` pattern (react-hook-form + zod).
- All required fields are validated client-side before submit.
- Show a loading spinner on the submit button while the mutation is in-flight.
- On success, navigate back to the Preview page for that record.
- On error, display a toast with the server error message.
- A "Cancel" button navigates back to the list page without saving.
