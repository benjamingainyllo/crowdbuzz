"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readTicketCode, rememberTicket } from "@/lib/ticket-session";
import { isReaction } from "@/lib/reactions";

/**
 * The room: who may talk in it, and what they may say.
 *
 * ONE RULE DOES MOST OF THE WORK — only somebody holding a ticket to this
 * event may post. Anyone can read, because a feed nobody can see is not
 * social proof. That asymmetry is the feature: it makes drive-by abuse on
 * a stranger's event impossible, and it turns the feed into something you
 * get for buying rather than a comment box on the open internet.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. This is user-generated content
 * published on somebody else's event page. Get it wrong and an organiser
 * wakes up to abuse under their own flyer at 2am, with one person at
 * CrowdBuzz to clean it up. So: ticket holders only, the organiser can
 * hide anything, and the organiser can switch the feed off entirely.
 *
 * Identity comes from the ticket cookie (lib/ticket-session.ts), never
 * from anything the browser sends in the request body. A client that
 * posts a ticket id it does not hold gets nothing.
 */

const MAX_BODY = 500;

export interface FeedPost {
  id: string;
  authorName: string | null;
  kind: "text" | "gif" | "photo";
  body: string | null;
  mediaUrl: string | null;
  createdAt: string;
  /** True when this browser's ticket wrote it. */
  mine: boolean;
}

function fail(error: string) {
  return { success: false as const, error };
}

/**
 * Resolve the browser's cookie to a ticket on THIS event.
 *
 * Returns null for a missing cookie, a code that no longer exists, a
 * ticket for a different event, or a ticket that has been voided or
 * refunded — somebody refunded out of an event should not still be
 * talking in its room.
 */
async function ticketFor(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string
): Promise<{ id: string; name: string | null } | null> {
  const code = readTicketCode();
  if (!code) return null;

  const { data } = await admin
    .from("tickets")
    .select("id, event_id, status, holder_name")
    .eq("code", code)
    .maybeSingle();

  if (!data) return null;
  if (data.event_id !== eventId) return null;
  if (data.status === "void" || data.status === "refunded") return null;

  return { id: data.id as string, name: (data.holder_name as string | null) ?? null };
}

/**
 * Bind this browser to a ticket, called by the ticket page.
 *
 * Verified before it is remembered: a made-up code in the URL must not
 * become a cookie that later looks like a credential.
 */
export async function claimTicket(code: string): Promise<{ ok: boolean }> {
  if (!code || typeof code !== "string") return { ok: false };
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tickets")
      .select("id, status")
      .eq("code", code)
      .maybeSingle();

    if (!data || data.status === "void") return { ok: false };
    rememberTicket(code);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Can this browser post here, and is the feed even on? */
export async function feedStatus(
  eventId: string
): Promise<{ enabled: boolean; canPost: boolean }> {
  if (!eventId) return { enabled: false, canPost: false };
  try {
    const admin = createAdminClient();
    const { data: event } = await admin
      .from("events")
      .select("feed_enabled")
      .eq("id", eventId)
      .maybeSingle();

    // A database without PART 18 has no column; treat that as off rather
    // than showing a composer that cannot work.
    const enabled = event?.feed_enabled === true;
    if (!enabled) return { enabled: false, canPost: false };

    return { enabled: true, canPost: (await ticketFor(admin, eventId)) !== null };
  } catch {
    return { enabled: false, canPost: false };
  }
}

export async function listFeed(eventId: string): Promise<FeedPost[]> {
  if (!eventId) return [];
  try {
    const admin = createAdminClient();
    const mine = await ticketFor(admin, eventId);

    const { data, error } = await admin
      .from("event_posts")
      .select("id, author_name, kind, body, media_url, created_at, ticket_id")
      .eq("event_id", eventId)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error || !data) return [];

    return (data as any[]).map((r) => ({
      id: r.id,
      authorName: r.author_name ?? null,
      kind: r.kind,
      body: r.body ?? null,
      mediaUrl: r.media_url ?? null,
      createdAt: r.created_at,
      mine: !!mine && r.ticket_id === mine.id,
    }));
  } catch {
    return [];
  }
}

export async function postToFeed(eventId: string, body: string) {
  if (!eventId) return fail("No event given.");

  const text = (body ?? "").trim();
  if (!text) return fail("Say something first.");
  if (text.length > MAX_BODY) return fail(`Keep it under ${MAX_BODY} characters.`);

  try {
    const admin = createAdminClient();

    const { data: event } = await admin
      .from("events")
      .select("id, feed_enabled, publish_status")
      .eq("id", eventId)
      .maybeSingle();

    if (!event || event.publish_status !== "published") return fail("That event isn't on sale.");
    if (event.feed_enabled !== true) return fail("The organiser has turned the feed off.");

    const mine = await ticketFor(admin, eventId);
    if (!mine) return fail("Only people holding a ticket can post here.");

    const { error } = await admin.from("event_posts").insert({
      event_id: eventId,
      ticket_id: mine.id,
      // Snapshotted, like ticket_type_name on tickets: a name resolved at
      // read time would rewrite history whenever somebody edited theirs.
      author_name: mine.name,
      kind: "text",
      body: text,
    });

    if (error) {
      return fail(
        error.message?.includes("event_posts")
          ? "The database is missing a table this needs — run setup.sql."
          : "That didn't post."
      );
    }

    revalidatePath(`/event/${eventId}`);
    return { success: true as const };
  } catch (error) {
    console.error("Feed post failed", error);
    return fail("That didn't post.");
  }
}

/**
 * The organiser taking something down.
 *
 * HIDDEN, NOT DELETED. A post removed at 2am is still there in the
 * morning when somebody asks what was actually said — which is the
 * difference between handling a complaint and guessing about it.
 */
export async function hidePost(postId: string) {
  if (!postId) return fail("No post given.");
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Sign in first.");

    const admin = createAdminClient();
    const { data: post } = await admin
      .from("event_posts")
      .select("id, event_id")
      .eq("id", postId)
      .maybeSingle();

    if (!post) return fail("Post not found.");

    const { data: event } = await admin
      .from("events")
      .select("creator_id")
      .eq("id", post.event_id)
      .maybeSingle();

    // Only the organiser whose event it is. Anyone else gets the same
    // answer as a made-up id.
    if (!event || event.creator_id !== user.id) return fail("Post not found.");

    const { error } = await admin
      .from("event_posts")
      .update({ hidden_at: new Date().toISOString(), hidden_by: user.id })
      .eq("id", postId);

    if (error) return fail("Could not hide that.");

    revalidatePath(`/event/${post.event_id}`);
    return { success: true as const };
  } catch {
    return fail("Could not hide that.");
  }
}

/**
 * Boop: one emoji, to one other guest, once.
 *
 * It carries no message and reveals no contact details — a guest can send
 * another guest exactly one of six emoji and nothing else. The unique
 * constraint means it is a wave, not a channel, which is what stops it
 * being used to pester somebody.
 */
export async function boop(eventId: string, toTicketId: string, emoji: string) {
  if (!eventId || !toTicketId) return fail("Nothing to send.");
  if (!isReaction(emoji)) return fail("That isn't one of the reactions.");

  try {
    const admin = createAdminClient();
    const mine = await ticketFor(admin, eventId);
    if (!mine) return fail("Only people holding a ticket can boop.");
    if (mine.id === toTicketId) return fail("You cannot boop yourself.");

    // The recipient has to be at the same event. Otherwise a ticket id
    // from anywhere would do.
    const { data: target } = await admin
      .from("tickets")
      .select("id, event_id, status")
      .eq("id", toTicketId)
      .maybeSingle();

    if (!target || target.event_id !== eventId) return fail("They aren't at this event.");
    if (target.status === "void" || target.status === "refunded") {
      return fail("They aren't at this event.");
    }

    const { error } = await admin.from("event_boops").insert({
      event_id: eventId,
      from_ticket_id: mine.id,
      to_ticket_id: toTicketId,
      emoji,
    });

    if (error) {
      // Already booped. The wave has happened; that is the end state.
      if (error.code === "23505") return { success: true as const, already: true };
      return fail("That didn't send.");
    }

    return { success: true as const };
  } catch {
    return fail("That didn't send.");
  }
}

/** Boops waiting for this browser's ticket. */
export async function myBoops(
  eventId: string
): Promise<{ emoji: string; createdAt: string }[]> {
  if (!eventId) return [];
  try {
    const admin = createAdminClient();
    const mine = await ticketFor(admin, eventId);
    if (!mine) return [];

    const { data } = await admin
      .from("event_boops")
      .select("emoji, created_at")
      .eq("to_ticket_id", mine.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return ((data as any[]) ?? []).map((r) => ({
      emoji: r.emoji,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
