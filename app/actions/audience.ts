"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { listAudience } from "@/lib/audience";

/**
 * Telling an organiser's past guests about their next event.
 *
 * This is the second-event engine. An organiser's first night earns them
 * an audience; their second night reaches it without them exporting a
 * spreadsheet or pasting numbers into a broadcast list.
 *
 * THREE THINGS GUARD IT, AND ALL THREE MATTER.
 *
 * 1. Only people who ticked the box are on the list at all — see
 *    lib/audience.ts. Nothing here can reach anybody else.
 * 2. Only the organiser who owns the event may send, checked against
 *    their session, not against anything the browser sent.
 * 3. One invite per event, enforced by a unique constraint rather than by
 *    this code being careful. An organiser tapping twice, or a retried
 *    request, cannot message the same people twice about the same night.
 */

export interface InviteResult {
  success: boolean;
  error?: string;
  sent?: number;
  failed?: number;
  total?: number;
}

function fail(message: string): InviteResult {
  return { success: false, error: message };
}

/** How many people this organiser could tell, for the button's label. */
export async function getAudienceSize(): Promise<number> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    return (await listAudience(user.id)).length;
  } catch {
    return 0;
  }
}

export async function inviteAudienceToEvent(eventId: string): Promise<InviteResult> {
  if (!eventId || typeof eventId !== "string") return fail("No event given.");

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Sign in first.");

    const admin = createAdminClient();

    const { data: event } = await admin
      .from("events")
      .select("id, title, creator_id, publish_status")
      .eq("id", eventId)
      .maybeSingle();

    if (!event) return fail("Event not found.");

    // Ownership, against the session. An organiser passing somebody
    // else's event id gets the same answer as a made-up one.
    if (event.creator_id !== user.id) return fail("Event not found.");

    if (event.publish_status !== "published") {
      return fail("Publish the event first — an invitation to a draft goes nowhere.");
    }

    const audience = await listAudience(user.id);
    if (audience.length === 0) {
      return fail(
        "Nobody on your list yet. Guests join it by ticking the box at checkout, so this fills up after your next event."
      );
    }

    // CLAIM THE INVITE BEFORE SENDING ANYTHING. The unique constraint on
    // event_id is what makes a double tap impossible; writing the row
    // first means a crash mid-send cannot be retried into a second blast.
    // The counts are corrected below once sending finishes.
    const { error: claimError } = await admin.from("audience_invites").insert({
      event_id: eventId,
      creator_id: user.id,
      recipients_total: audience.length,
    });

    if (claimError) {
      if (claimError.code === "23505") {
        return fail("You have already invited your guests to this event.");
      }
      if (claimError.message?.includes("audience_invites")) {
        return fail("The database is missing a table this needs — run setup.sql, then try again.");
      }
      return fail("Could not start that invitation.");
    }

    const provider = getWhatsAppProvider();
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://trycrowdbuzz.com";
    const eventUrl = `${site}/event/${eventId}`;

    let sent = 0;
    let failed = 0;

    // One at a time on purpose. This is tens of messages, not thousands,
    // and a burst of parallel sends is what makes a WhatsApp number look
    // like a spammer to the very system we are being careful about.
    for (const member of audience) {
      try {
        const res = await provider.sendAnnouncement({
          to: member.phone.replace(/^\+/, ""),
          guestName: member.name,
          eventTitle: event.title,
          body: `${event.title} is live. You came to a previous one, so you are hearing about this first. Tickets are on sale now.`,
          eventUrl,
        });
        if (res.ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    await admin
      .from("audience_invites")
      .update({ whatsapp_sent: sent, whatsapp_failed: failed })
      .eq("event_id", eventId);

    // Stamp who was written to, so a future invite can show an organiser
    // when they last messaged somebody.
    if (sent > 0) {
      await admin
        .from("organiser_audience")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("creator_id", user.id)
        .is("unsubscribed_at", null);
    }

    revalidatePath("/events");
    revalidatePath(`/event/${eventId}`);

    return { success: true, sent, failed, total: audience.length };
  } catch (error) {
    console.error("Audience invite failed", error);
    return fail("That invitation did not go out.");
  }
}
