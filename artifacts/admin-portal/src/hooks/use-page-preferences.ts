import { useState, useCallback } from "react";

/** Decode the userId from the stored JWT without crypto verification (read-only, for localStorage keying). */
function getAdminUserId(): string {
  const token = localStorage.getItem("admin_token");
  if (!token) return "anon";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.userId ?? "anon");
  } catch {
    return "anon";
  }
}

/**
 * Persist UI state (view mode, filters, page size, etc.) in localStorage, scoped
 * per admin user and page name. Changes are written synchronously on every update
 * so preferences survive page reloads and re-logins.
 *
 * @param pageKey  A stable string identifier for the page, e.g. "users" or "properties"
 * @param defaults Default values used only when no stored prefs exist yet
 */
export function usePagePreferences<T extends Record<string, unknown>>(
  pageKey: string,
  defaults: T,
): [T, (updates: Partial<T>) => void] {
  const storageKey = `admin_prefs_${getAdminUserId()}_${pageKey}`;

  const [prefs, setPrefs] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {
      /* ignore parse errors */
    }
    return defaults;
  });

  const updatePrefs = useCallback(
    (updates: Partial<T>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* storage full or unavailable — still update in-memory */
        }
        return next;
      });
    },
    [storageKey],
  );

  return [prefs, updatePrefs];
}
