---
name: Admin portal UI rules
description: The 9 UI rules governing all modules in the AqariTalk Admin Portal.
---

## Rules (all modules must follow these)
1. **Sub-pages**: Every module has New, Edit, and Preview sub-pages — no dialogs for data entry.
2. **View toggle**: Table + Card view toggle on every list page.
3. **Pagination**: 10/25/50/100 per-page dropdown at bottom; default 25.
4. **Row click → Preview**: Clicking a row or card navigates to the Preview sub-page.
5. **Actions column**: 3 icons — Eye (view), Pencil (edit), Trash2 (delete).
6. **Soft-delete only**: Never physical delete; set deletedAt + status="deleted".
7. **Delete guard**: AlertDialog with Yes/No before executing delete.
8. **Data-appropriate filters**: Each module has filters relevant to its content (search + enum dropdowns).
9. **Form conventions**: react-hook-form + zod validation; success → Preview page; Cancel → List page.

## User status levels (4 values)
- `active` — full access
- `restricted` — can log in, cannot post or chat (first offence)
- `suspended` — cannot log in, temporary
- `banned` — permanent lockout

## User editable fields
- Name, Role, Status, Market (phone is read-only — it is the auth credential)

## Admin create conventions
- Admin-created users bypass OTP and are auto-verified; default status is `active`
- Admin-created listings go live immediately (status = `active`); no review needed

## Route order in App.tsx
- Specific routes MUST come before param routes: `/users/new` before `/users/:id`.
