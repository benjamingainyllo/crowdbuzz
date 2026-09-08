/**
 * The parts of the referral offer that middleware is allowed to touch.
 *
 * Kept out of lib/referrals.ts because that module is server-only — it
 * carries the service key — and middleware runs on the Edge runtime,
 * where importing it would fail the build. These four things are pure
 * string handling with no database behind them, so they are safe to share
 * between both worlds. lib/referrals.ts re-exports them, so nothing else
 * needs to know this file exists.
 */

/** Where a visitor's referral code waits until they finish signing up. */
export const REFERRAL_COOKIE = "crowdbuzz_ref";

/**
 * The cookie this used to be called.
 *
 * Renaming a cookie silently drops anyone who clicked a referral link
 * before the rename and has not signed up yet — their credit would just
 * vanish, and the friend who invited them would never know why. Read the
 * old names as a fallback; each can go ninety days after its own rename,
 * which is the cookie's own lifetime.
 *
 * Two of them now: Paylance became Doorlane on 6 September 2026 and
 * Doorlane became CrowdBuzz on the 8th. Two renames inside a week is
 * exactly when a link clicked on the Monday is most likely to be spent on
 * the Wednesday, so both stay readable.
 */
export const LEGACY_REFERRAL_COOKIES = ["doorlane_ref", "paylance_ref"] as const;

/** @deprecated Read LEGACY_REFERRAL_COOKIES — there are two now. */
export const LEGACY_REFERRAL_COOKIE = "doorlane_ref";

/**
 * Ninety days. Long enough that somebody can see a friend's link, think
 * about it for a month and still be attributed; short enough that a
 * shared computer doesn't credit a stranger a year later.
 */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** Six characters, from an alphabet with no O/0 and no I/1. */
const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Returns the code in canonical form, or null if it isn't one.
 *
 * This is the gate on a value that arrives in a query string, so it
 * rejects rather than repairs: anything that isn't exactly six characters
 * from the alphabet never reaches a database query at all.
 */
export function normaliseReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}
