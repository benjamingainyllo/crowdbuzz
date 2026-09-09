"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/whatsapp";
import { cityByKey } from "@/lib/cities";

/**
 * "Tell me what's on."
 *
 * Somebody browsing /explore who does not want to check back every week
 * leaves a WhatsApp number and the cities they care about.
 *
 * THIS LIST IS CROWDBUZZ'S, AND THAT IS THE DIFFERENCE FROM
 * app/actions/audience.ts. That one belongs to an organiser and we never
 * message it. This one is ours. Two separate relationships, two separate
 * consents, and they must never be merged — somebody who agreed to hear
 * from a promoter about that promoter's next night has not agreed to a
 * weekly roundup from us.
 *
 * The rules are the same either way, because the rules are not about
 * whose list it is: consent before a message, the moment recorded, and a
 * stop that stays stopped.
 */

export interface SubscribeResult {
  success: boolean;
  error?: string;
  /** True when they were already on the list. Shown as success, because it is. */
  already?: boolean;
}

function fail(error: string): SubscribeResult {
  return { success: false, error };
}

export async function subscribeToDiscovery(
  rawPhone: string,
  cityKeys: string[]
): Promise<SubscribeResult> {
  const phone = toE164(rawPhone ?? "");
  if (!phone) {
    return fail("That doesn't look like a Nigerian number. Try 0803 123 4567.");
  }

  // Only keys we actually know. An unknown key is either a stale page or
  // somebody editing the request, and neither should reach the database.
  const cities = Array.from(
    new Set((Array.isArray(cityKeys) ? cityKeys : []).filter((k) => !!cityByKey(k)))
  ).slice(0, 12);

  try {
    const admin = createAdminClient();

    const { error } = await admin.from("discovery_subscribers").insert({
      phone,
      cities,
      source: "explore",
    });

    if (error) {
      // Already on the list. That is the state they wanted, so it is a
      // success — but their city choice may have changed, so take it.
      if (error.code === "23505") {
        await admin
          .from("discovery_subscribers")
          .update({ cities })
          .eq("phone", phone)
          // NOT for somebody who has unsubscribed. Re-submitting the form
          // must not quietly resurrect a stopped number; they would have
          // to be explicitly re-subscribed, which this form does not do.
          .is("unsubscribed_at", null);
        return { success: true, already: true };
      }

      if (error.message?.includes("discovery_subscribers")) {
        return fail("Not quite ready — the database needs setup.sql run.");
      }
      return fail("That didn't save. Try again in a moment.");
    }

    return { success: true };
  } catch (error) {
    console.error("Discovery subscribe failed", error);
    return fail("That didn't save. Try again in a moment.");
  }
}
