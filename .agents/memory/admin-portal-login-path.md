---
name: Admin portal login path
description: The correct API path for admin portal password authentication.
---

## Rule
Admin portal login is `POST /api/admin/portal/login` (registered in `artifacts/api-server/src/routes/admin-portal-auth.ts`).

**Why:** Route is defined as `router.post("/admin/portal/login", ...)` which, under the `/api` prefix, becomes `/api/admin/portal/login`. A common mistake is using `/api/admin-portal/login` (hyphen instead of slash after "admin").

**How to apply:** Use this path in curl smoke tests and frontend integration checks.
