---
name: System settings table
description: How the system_settings table works and the get-or-create pattern used by the backend.
---

The rule: `system_settings` is a single-row table. Always use the `getOrCreateSettings()` helper in `artifacts/api-server/src/routes/settings.ts` to fetch or bootstrap the row.

**Why:** There's exactly one global configuration for the platform. Rather than requiring a migration seed step, the first GET or PUT call creates the row with all defaults. This keeps setup zero-friction.

**How to apply:**
- GET `/admin/settings` → `getOrCreateSettings()` → serialize with `toResponse()` (converts `aiTemperature` from numeric string to JS number, and `updatedAt` Date to ISO string)
- PUT `/admin/settings` → validate with `UpdateAdminSettingsBody` from `@workspace/api-zod` → patch only provided fields → return `UpdateAdminSettingsResponse.parse(toResponse(updated))`
- Frontend hooks: `useGetAdminSettings()` / `useUpdateAdminSettings()` / `getGetAdminSettingsQueryKey()` from `@workspace/api-client-react`
- Schema file: `lib/db/src/schema/system-settings.ts`
- Route file: `artifacts/api-server/src/routes/settings.ts`
