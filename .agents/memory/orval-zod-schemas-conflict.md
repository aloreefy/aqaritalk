---
name: Orval zod schemas option causes duplicate exports
description: The schemas option in orval's zod output config generates TypeScript interfaces that collide with zod schema export names when new schemas are added.
---

## Rule
Remove `schemas: { path: "generated/types", type: "typescript" }` from the `zod` output in `lib/api-spec/orval.config.ts`.

**Why:** When `schemas` is set, orval generates TypeScript interfaces in `generated/types/` AND zod schemas in `generated/api.ts`, both with the same name (e.g. `AdminCreatePropertyBody`). The auto-generated `lib/api-zod/src/index.ts` then re-exports both, causing `TS2308: Module has already exported a member` errors. The `schemas` output is only useful for the react client, not the zod validator package.

**How to apply:** After any codegen that adds new schemas and produces TS2308 errors, check if `schemas` is present in the `zod` output config. Remove it, then manually ensure `lib/api-zod/src/index.ts` only contains `export * from "./generated/api";` (orval may regenerate the index, so verify after each codegen run).
