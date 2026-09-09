import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/whatsapp";

/**
 * An organiser's own audience: the people who bought a ticket and said
 * yes to hearing about the next one.
 *
 * THE WHOLE FEATURE RESTS ON ONE RULE. A row exists here only because a
 * buyer ticked a box. Not because they bought. Not because we have their
 * number. Because they were asked, in plain words, and said yes.
 *
 * That is not politeness, it is the product surviving. WhatsApp bans
 * numbers that message people who did not consent, and the number that
 * would be banned is the same one that delivers every ticket. Getting
 * this wrong does not cost us a marketing channel; it breaks ticketing.
 *
 * THE LIST BELONGS TO THE ORGANISER. Every query here is keyed on
 * creator_id and none of them crosses between organisers. CrowdBuzz never
 * messages this list on its own behalf and never will — the same
 * principle as the money. We do not hold their funds and we do not hold
 * their crowd.
 */

export interface AudienceMember {
  id: string;
  phone: string;
  name: string | null;
}

/**
 * Record consent from a paid order.
 *
 * CALLED AT SETTLEMENT, NOT AT CHECKOUT. Somebody who reached the payment
 * page, ticked the box and then abandoned has not bought anything, and
 * adding them would build a list out of people who changed their mind.
 *
 * Idempotent: a replayed webhook re-runs this and the unique constraint
 * turns the second write into a no-op. Deliberately does NOT clear
 * unsubscribed_at — somebody who has said stop stays stopped even if they
 * buy again and tick the box, because the safer reading of a re-tick is
 * that they did not notice it.
 */
export async function recordAudienceOptIn(order: {
  creator_id?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  event_id?: string | null;
  marketing_opt_in?: boolean | null;
}): Promise<void> {
  if (!order?.marketing_opt_in) return;
  if (!order.creator_id || !order.buyer_phone) return;

  // Normalise before storing, or "0803 123 4567" and "+2348031234567"
  // become two people and get two messages.
  const phone = toE164(order.buyer_phone);
  if (!phone) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("organiser_audience").insert({
      creator_id: order.creator_id,
      phone,
      email: order.buyer_email ?? null,
      name: order.buyer_name ?? null,
      source_event_id: order.event_id ?? null,
    });

    // 23505 is the unique constraint: they are already on this
    // organiser's list. That is the correct end state, not a failure.
    if (error && error.code !== "23505") {
      console.error("Could not record audience opt-in:", error.message);
    }
  } catch (error) {
    // Never let this break settlement. A buyer who has paid must get
    // their ticket whether or not we managed to file their consent.
    console.error("Audience opt-in failed:", error);
  }
}

/** Who an organiser may message, newest consent first. */
export async function listAudience(creatorId: string): Promise<AudienceMember[]> {
  if (!creatorId) return [];

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organiser_audience")
      .select("id, phone, name")
      .eq("creator_id", creatorId)
      .is("unsubscribed_at", null)
      .order("opted_in_at", { ascending: false });

    if (error || !data) return [];
    return data as AudienceMember[];
  } catch {
    // An un-migrated database has no table, which reads correctly as
    // "this organiser has no audience yet".
    return [];
  }
}

/** How many people an organiser could reach. For the button's label. */
export async function audienceSize(creatorId: string): Promise<number> {
  return (await listAudience(creatorId)).length;
}

/**
 * Stop messaging somebody, for one organiser.
 *
 * Marked, never deleted. A deleted row would be silently recreated by
 * their next ticket purchase and they would start hearing from the same
 * organiser again — which is exactly the thing that gets a number
 * reported.
 */
export async function unsubscribe(creatorId: string, rawPhone: string): Promise<boolean> {
  const phone = toE164(rawPhone);
  if (!creatorId || !phone) return false;

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("organiser_audience")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("creator_id", creatorId)
      .eq("phone", phone)
      .is("unsubscribed_at", null);

    return !error;
  } catch {
    return false;
  }
}
