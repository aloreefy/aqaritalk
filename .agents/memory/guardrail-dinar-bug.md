---
name: Guardrail false positive — دين in دينار
description: Arabic substring collision between "دين" (religion keyword) and "دينار" (JOD currency) caused the off-topic guardrail to fire on every message mentioning price.
---

# Guardrail False Positive: دين inside دينار

**The bug:** The original `HARD_OFF_TOPIC` list contained `"دين"` (religion). Arabic substring search via `text.includes("دين")` matches inside `"دينار"` (Jordanian dinar currency), because "دين" is a prefix of "دينار". This silently triggered the off-topic guardrail on every seller or buyer message that included a price in JOD (e.g. "السعر 65000 دينار"), returning the generic off-topic response in ~8ms instead of calling Gemini.

**Why it was invisible:** No error was logged (guardrail is a deliberate code path, not an exception), response was 200 OK, and the off-topic response text is plausible-looking Arabic. The only telltale was 8ms response time (no network call to Gemini).

**Fix applied:** Replace bare root keywords with explicit full-form Arabic keywords that won't substring-match common real estate vocabulary:
- Instead of `"دين"` → use `"الدين"`, `"ديني"`, `"دينية"` (which won't match "دينار")
- Similarly be careful with other short Arabic roots that could appear inside longer words

**How to apply:** When adding new off-topic keywords in Arabic, always test against the full real estate keyword list to verify no false positives. Particularly dangerous: short 2-3 letter Arabic roots that appear as prefixes in common real estate terms (city names, currency names, property types).

**File:** `artifacts/api-server/src/services/ai/guardrails.ts`
