---
name: api-server zod import rule
description: Why api-server routes must not import zod/v4 directly, and what to use instead.
---

The rule: never `import { z } from "zod/v4"` in `artifacts/api-server/src/`. esbuild (used by the api-server build) cannot resolve the `zod/v4` subpath export and fails the build.

**Why:** The api-server's `build.mjs` uses esbuild with `bundle: true` and `platform: "node"`. esbuild does not support the `exports` field in package.json for subpath resolution in all cases, so `zod/v4` causes: `ERROR: Could not resolve "zod/v4"`.

**How to apply:** Import validation schemas from `@workspace/api-zod` instead. Orval generates Zod objects (e.g. `UpdateAdminSettingsBody`, `AdminUpdateUserBody`) for all request/response bodies. Use those. If a schema is missing, define it inline using `import { z } from "zod"` (bare, not `zod/v4`) — the bare `zod` import resolves correctly.
