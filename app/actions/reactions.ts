"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureVisitorKey, readVisitorKey } from "@/lib/visitor";
import {
  emptyCounts,
  isReaction,
  type Reaction,
  type ReactionCounts,
} from "@/lib/reactions";

/**
 * Reacting to an event without an account.
 *
 * THE SAME SHAPE AS toggleInterest, AND THAT IS THE POINT. Read the note
 * at the top of app/actions/interest.ts: why the service key, why it is
 * safe to expose, and what it deliberately does not protect against. All
 * of it applies here unchanged. Two features that are the same shape
 * should be the same implementation — the second copy is where the
 * subtly different hole lives.
 *
 * The one addition is the emoji, which is validated against the fixed
 * list in lib/reactions.ts before it reaches the database. The database
 * checks it again anyway.
 */

export interface ReactionResult {
  ok: boolean;
  /** Whether this browser now holds that reaction. */
  mine: boolean;
  counts: ReactionCounts;
  error?: string;
}

/** Counts for one event, grouped in the database rather than in memory. */
async function countsFor(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string
): Promise<ReactionCounts> {
  const counts = emptyCounts();

  const { data, error } = await admin
    .from("event_reactions")
    .select("emoji")
    .eq("event_id", eventId);

  // A database that has not run PART 16 yet has no table. That is not an
  // error worth showing a visitor — the page renders with nothing tapped,
  // which is what it would look like anyway.
  if (error || !data) return counts;

  for (const row of data as { emoji: string }[]) {
    if (isReaction(row.emoji)) counts[row.emoji] += 1;
  }
  return counts;
}

export async function toggleReaction(
  eventId: string,
  emoji: string
): Promise<ReactionResult> {
  const counts = emptyCounts();

  if (!eventId || typeof eventId !== "string") {
    return { ok: false, mine: false, counts, error: "No event given." };
  }
  if (!isReaction(emoji)) {
    return { ok: false, mine: false, counts, error: "That isn't one of the reactions." };
  }

  const admin = createAdminClient();

  // Published only — a draft's id in a crafted request must not become a
  // way to confirm that the draft exists.
  const { data: event } = await admin
    .from("events")
    .select("id, publish_status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.publish_status !== "published") {
    return { ok: false, mine: false, counts, error: "This is a preview event, so nothing here saves." };
  }

  const visitorKey = ensureVisitorKey();

  let userId: string | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Nobody is signed in. That is the normal case here, not a failure.
  }

  const { data: existing } = await admin
    .from("event_reactions")
    .select("id")
    .eq("event_id", eventId)
    .eq("visitor_key", visitorKey)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await admin.from("event_reactions").delete().eq("id", existing.id);
    if (error) {
      console.error("Could not remove reaction:", error);
      return {
        ok: false,
        mine: true,
        counts: await countsFor(admin, eventId),
        error: "Couldn't undo that.",
      };
    }
  } else {
    const { error } = await admin
      .from("event_reactions")
      .insert({ event_id: eventId, visitor_key: visitorKey, emoji, user_id: userId });

    // 23505 is a unique violation: two taps raced each other. The visitor
    // meant "react", the row exists, the count is right — success.
    if (error && error.code !== "23505") {
      console.error("Could not add reaction:", error);
      return {
        ok: false,
        mine: false,
        counts: await countsFor(admin, eventId),
        error: error.message?.includes("event_reactions")
          ? "The database is missing a table this needs — run setup.sql."
          : "Couldn't react to that.",
      };
    }
  }

  revalidatePath(`/event/${eventId}`);

  return {
    ok: true,
    mine: !existing,
    counts: await countsFor(admin, eventId),
  };
}

/**
 * Every count for an event, plus which ones this browser holds.
 *
 * Read from the client on mount rather than threaded through the event
 * loader, because the answer depends on a cookie while the event itself
 * is cacheable — the same split interest.ts makes, for the same reason.
 */
export async function getReactions(
  eventId: string
): Promise<{ counts: ReactionCounts; mine: Reaction[] }> {
  if (!eventId) return { counts: emptyCounts(), mine: [] };

  const admin = createAdminClient();
  const visitorKey = readVisitorKey();

  try {
    const [counts, mineRows] = await Promise.all([
      countsFor(admin, eventId),
      visitorKey
        ? admin
            .from("event_reactions")
            .select("emoji")
            .eq("event_id", eventId)
            .eq("visitor_key", visitorKey)
        : Promise.resolve({ data: [] as { emoji: string }[] }),
    ]);

    const mine = ((mineRows as { data: { emoji: string }[] | null }).data ?? [])
      .map((r) => r.emoji)
      .filter(isReaction);

    return { counts, mine };
  } catch (error) {
    console.error("Could not read reactions:", error);
    return { counts: emptyCounts(), mine: [] };
  }
}
