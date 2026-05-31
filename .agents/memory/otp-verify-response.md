---
name: OTP verify response shape
description: VerifyOtpResponse Zod schema requires isNewUser boolean and user.createdAt/updatedAt; omitting them causes a 500.
---

The `VerifyOtpResponse` schema (in `lib/api-zod`) requires three fields that are easy to forget when building the verify handler:

1. **`isNewUser: boolean`** — must be explicitly computed (track whether the user row was INSERTed vs SELECTed).
2. **`user.createdAt`** — must be included from the DB row; Zod uses `coerce.date()` so the raw Date object is fine, but it must be present.
3. **`user.updatedAt`** — same as above.

**Why:** All three were absent from the initial handler (`auth.ts`). The Zod `.parse()` call at response time throws a ZodError that Express catches and returns as 500, and the frontend shows "حدث خطأ" with no useful detail.

**How to apply:** Whenever adding or refactoring the `/auth/otp/verify` handler, ensure the response object includes `isNewUser`, `user.createdAt`, and `user.updatedAt` drawn from the DB row.
