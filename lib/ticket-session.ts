import "server-only";

import { cookies } from "next/headers";

/**
 * Proving you hold a ticket, without an account.
 *
 * THE PROBLEM. Only ticket holders may post in an event's feed, and a
 * ticket holder has no account, no password and nothing to sign in with.
 * The one secret they do have is the ticket code — the same unguessable
 * string that shows their QR at /ticket/<code>.
 *
 * THE ANSWER. Opening their own ticket page binds that browser to that
 * ticket with an httpOnly cookie. The feed then reads the cookie. Nothing
 * new to remember, nothing new to lose, and the credential is one they
 * already had to have.
 *
 * WHY THIS IS NOT THE VISITOR COOKIE. lib/visitor.ts is explicit that a
 * visitor key is not an identity and must never gate anything that has to
 * be right about a person. This one does gate something — who may write
 * on somebody else's event page — so it is a separate cookie holding a
 * separate, meaningful claim: "this browser has seen a real ticket code".
 *
 * WHAT IT IS STILL NOT. It is not proof of who somebody is, only that
 * they hold a ticket. Sharing a ticket code shares the ability to post,
 * exactly as it already shares the ability to get through the door — so
 * the blast radius of a leaked code does not grow here. It must never be
 * used to move money, refund anything, or reach an organiser's account.
 */

export const TICKET_COOKIE = "cb_ticket";
const A_MONTH = 60 * 60 * 24 * 30;

/** Ticket codes are generated in lib/tickets.ts; this matches their shape. */
const CODE_SHAPE = /^[A-Z0-9-]{6,32}$/;

export function readTicketCode(): string | null {
  const value = cookies().get(TICKET_COOKIE)?.value ?? null;
  if (!value) return null;
  return CODE_SHAPE.test(value) ? value : null;
}

/**
 * Remember that this browser opened a real ticket.
 *
 * ONLY CALLABLE FROM A SERVER ACTION OR ROUTE HANDLER — Next refuses a
 * cookie write during a plain render. The ticket page therefore claims it
 * through an action rather than as a side effect of rendering, which is
 * also the honest order: seeing the page is what earns the cookie.
 *
 * A month, not a year. A ticket's feed stops mattering shortly after the
 * night, and a credential that outlives its usefulness is a credential
 * waiting to be found on a shared phone.
 */
export function rememberTicket(code: string): void {
  if (!CODE_SHAPE.test(code)) return;
  cookies().set(TICKET_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: A_MONTH,
  });
}

export function forgetTicket(): void {
  cookies().delete(TICKET_COOKIE);
}
