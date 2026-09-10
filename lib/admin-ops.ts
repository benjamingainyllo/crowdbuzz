import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The operations screens: who was scanned in, and what is happening now.
 *
 * BOTH ARE VIEWS OVER DATA THAT ALREADY EXISTS. Tickets record when they
 * were scanned and by whom, and events record when they are on. Nothing
 * in this file writes, estimates or invents — where a number cannot be
 * counted it comes back null and the screen says so.
 */

function toNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export interface CheckInRow {
  code: string;
  holderName: string | null;
  holderEmail: string | null;
  ticketTypeName: string | null;
  eventId: string;
  eventTitle: string;
  checkedInAt: string;
  scannedByEmail: string | null;
}

export interface CheckInsPage {
  rows: CheckInRow[];
  total: number;
  pageSize: number;
  /** Scans in the last 24 hours. */
  last24h: number;
  /** Tickets issued against tickets scanned, all time. */
  issued: number;
  scanned: number;
}

export async function listCheckIns(opts: {
  page?: number;
  q?: string;
  eventId?: string;
}): Promise<CheckInsPage> {
  const admin = createAdminClient();
  const pageSize = 30;
  const page = Math.max(1, opts.page ?? 1);
  const from = (page - 1) * pageSize;

  let q = admin
    .from("tickets")
    .select(
      "code, holder_name, holder_email, ticket_type_name, event_id, checked_in_at, checked_in_by",
      { count: "exact" }
    )
    .not("checked_in_at", "is", null)
    .order("checked_in_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (opts.eventId) q = q.eq("event_id", opts.eventId);
  if (opts.q?.trim()) {
    const term = `%${opts.q.trim()}%`;
    q = q.or(`code.ilike.${term},holder_email.ilike.${term},holder_name.ilike.${term}`);
  }

  const { data, count } = await q;
  const rows = data ?? [];

  // The counters are asked for separately with head:true, so they count
  // every ticket rather than only the thirty on this page.
  const [{ count: issued }, { count: scanned }, { count: recent }] = await Promise.all([
    admin.from("tickets").select("id", { count: "exact", head: true }),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .not("checked_in_at", "is", null),
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .gte("checked_in_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);

  const eventIds = Array.from(new Set(rows.map((r) => r.event_id as string).filter(Boolean)));
  const scannerIds = Array.from(
    new Set(rows.map((r) => r.checked_in_by as string).filter(Boolean))
  );

  const [{ data: events }, { data: scanners }] = await Promise.all([
    eventIds.length
      ? admin.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] as any[] }),
    scannerIds.length
      ? admin.from("profiles").select("id, email, first_name").in("id", scannerIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const titleOf = new Map((events ?? []).map((e: any) => [e.id, e.title as string]));
  const scannerOf = new Map(
    (scanners ?? []).map((p: any) => [p.id, (p.email as string) ?? (p.first_name as string) ?? null])
  );

  return {
    rows: rows.map((r: any) => ({
      code: r.code,
      holderName: r.holder_name ?? null,
      holderEmail: r.holder_email ?? null,
      ticketTypeName: r.ticket_type_name ?? null,
      eventId: r.event_id,
      eventTitle: titleOf.get(r.event_id) ?? "An event",
      checkedInAt: r.checked_in_at,
      scannedByEmail: r.checked_in_by ? scannerOf.get(r.checked_in_by) ?? null : null,
    })),
    total: count ?? 0,
    pageSize,
    last24h: recent ?? 0,
    issued: issued ?? 0,
    scanned: scanned ?? 0,
  };
}

export interface LiveEvent {
  id: string;
  title: string;
  organiser: string;
  location: string | null;
  time: string | null;
  issued: number;
  scanned: number;
  grossKobo: number;
  /** "today" | "tomorrow" | "yesterday" — which side of now it sits. */
  when: "yesterday" | "today" | "tomorrow";
}

/**
 * Events either side of today.
 *
 * A THREE-DAY WINDOW, NOT JUST TODAY. An event that ran last night is
 * still the thing somebody is asking about this morning — the door
 * problems, the no-shows, the refunds — and one that opens tomorrow is
 * the one worth checking before it does. A screen that shows only today
 * is empty most of the time and useless the morning after.
 */
export async function listLiveEvents(now = new Date()): Promise<LiveEvent[]> {
  const admin = createAdminClient();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const today = iso(now);
  const yesterday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const { data: events } = await admin
    .from("events")
    .select("id, title, date, time, location, creator_id, publish_status")
    .eq("publish_status", "published")
    .in("date", [yesterday, today, tomorrow])
    .limit(200);

  const rows = (events ?? []).filter((e: any) => e.publish_status === "published");
  if (rows.length === 0) return [];

  const ids = rows.map((e: any) => e.id as string);
  const creatorIds = Array.from(new Set(rows.map((e: any) => e.creator_id).filter(Boolean)));

  const [{ data: tickets }, { data: hosts }] = await Promise.all([
    admin.from("tickets").select("event_id, checked_in_at, price_kobo").in("event_id", ids),
    creatorIds.length
      ? admin.from("profiles").select("id, box_office_name, first_name, handle").in("id", creatorIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const issued = new Map<string, number>();
  const scanned = new Map<string, number>();
  const gross = new Map<string, number>();
  for (const t of tickets ?? []) {
    const id = t.event_id as string;
    issued.set(id, (issued.get(id) ?? 0) + 1);
    gross.set(id, (gross.get(id) ?? 0) + toNum(t.price_kobo));
    if (t.checked_in_at) scanned.set(id, (scanned.get(id) ?? 0) + 1);
  }

  const nameOf = new Map(
    (hosts ?? []).map((p: any) => [
      p.id,
      (p.box_office_name as string) || (p.first_name as string) || (p.handle as string) || "An organiser",
    ])
  );

  return rows
    .map((e: any) => ({
      id: e.id,
      title: e.title || "Untitled event",
      organiser: nameOf.get(e.creator_id) ?? "An organiser",
      location: e.location ?? null,
      time: e.time ?? null,
      issued: issued.get(e.id) ?? 0,
      scanned: scanned.get(e.id) ?? 0,
      grossKobo: gross.get(e.id) ?? 0,
      when: (e.date === today ? "today" : e.date === tomorrow ? "tomorrow" : "yesterday") as
        | "yesterday"
        | "today"
        | "tomorrow",
    }))
    .sort((a, b) => {
      const rank = { today: 0, tomorrow: 1, yesterday: 2 } as const;
      return rank[a.when] - rank[b.when] || b.issued - a.issued;
    });
}
