/**
 * Handle rules.
 *
 * A creator's handle becomes their public URL at `/<handle>`, which sits in the
 * same namespace as the app's own routes. Without this guard, someone could
 * take "events" or "login" and their storefront would be permanently
 * unreachable — the app route wins and there is no error to see.
 */

const RESERVED = new Set([
  // App routes, present and legacy
  "login", "logout", "signin", "signup", "register", "onboarding",
  "overview", "home", "dashboard", "settings", "account", "profile",
  "offers", "offer", "events", "event", "store", "storefront",
  "revenue", "income", "payouts", "payout", "audience", "customers",
  "analytics", "experiments", "automations", "integrations",
  "checkout", "cart", "order", "orders", "success", "cancel",
  // Infrastructure
  "api", "auth", "admin", "static", "assets", "public", "_next",
  "webhook", "webhooks", "callback", "health",
  // Brand and support surfaces we may want later
  "doorlane", "support", "help", "docs", "blog", "pricing", "terms",
  // The name this product launched under. Kept reserved so nobody can
  // register /paylance and inherit whatever old links point at it.
  "paylance",
  "privacy", "legal", "contact", "about", "status", "app", "www",
]);

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** Lowercase, trim, and strip anything that isn't allowed in a URL segment. */
export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, HANDLE_MAX);
}

export interface HandleCheck {
  ok: boolean;
  /** Why it's invalid, phrased for the person typing it. */
  reason?: string;
}

export function checkHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);

  if (handle.length === 0) {
    return { ok: false, reason: "Pick a handle — it becomes your public link." };
  }
  if (handle.length < HANDLE_MIN) {
    return { ok: false, reason: `At least ${HANDLE_MIN} characters.` };
  }
  if (!/^[a-z0-9]/.test(handle)) {
    return { ok: false, reason: "Start with a letter or number." };
  }
  if (RESERVED.has(handle)) {
    return { ok: false, reason: "That one's reserved. Try another." };
  }

  return { ok: true };
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED.has(normalizeHandle(handle));
}
