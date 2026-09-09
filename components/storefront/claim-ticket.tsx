"use client";

import { useEffect } from "react";
import { claimTicket } from "@/app/actions/feed";

/**
 * Remembers, on this browser, that you hold this ticket.
 *
 * WHY A COMPONENT AND NOT PART OF THE RENDER. Next refuses a cookie write
 * during a plain render, and that restriction is correct here: the page
 * should not tag a reader as a side effect of being looked at. Opening
 * your own ticket is a deliberate act, so it runs as an action on mount.
 *
 * The code is verified server-side before it is remembered — a made-up
 * code in the URL must not become a cookie that later looks like a
 * credential. Renders nothing.
 */
export function ClaimTicket({ code }: { code: string }) {
  useEffect(() => {
    claimTicket(code).catch(() => {
      // The feed simply will not offer a composer. Nothing else depends
      // on this, and the ticket itself is already on screen.
    });
  }, [code]);

  return null;
}
