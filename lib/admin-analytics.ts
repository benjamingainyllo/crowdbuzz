import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  cappedFeeKobo,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  platformFeeCapKobo,
  type Kobo,
} from "@/lib/money";

/**
 * What is actually happening to the business.
 *
 * EVERY FIGURE HERE IS COMPUTED FROM ROWS. There is no estimate, no
 * seeded value and no placeholder anywhere in this file, and there must
 * never be: this is the screen the pricing and the fundraising get argued
 * from, and one invented number on it poisons every decision downstream.
 * Where the data does not exist to answer a question, the answer is
 * `available: false` and the screen says so — see `funnel` at the bottom.
 *
 * FREE REGISTRATIONS ARE NOT REVENUE AND ARE SEPARATED HERE. A free RSVP
 * settles to status 'paid' like any other order, because that is how a
 * ticket gets issued for it. So a naive "orders where status = paid" mixes
 * money with no money, and every rate built on it flatters itself — forty
 * free RSVPs read as forty paid orders and the take rate collapses to a
 * rounding error. lib/platform-stats.ts makes the same split for the same
 * reason; the rule is the product's, not this file's.
 *
 * ONE PASS, THEN ARITHMETIC IN MEMORY. Four reads happen here and every
 * figure on the page is derived from them. Asking the database a separate
 * question per tile is how a console becomes the slowest screen in a
 * product, and this one is read by the person least able to wait.
 */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toNum(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export interface MonthPoint {
  /** "Sep 26" */
  label: string;
  grossKobo: Kobo;
  feesKobo: Kobo;
  paidOrders: number;
  ticketsPaid: number;
  /** Fees ÷ gross for THIS month, as a percentage. Null when nothing sold. */
  takePct: number | null;
}

export interface OrganiserShare {
  name: string;
  handle: string | null;
  feesKobo: Kobo;
  /** This organiser's share of all fees, as a percentage. */
  sharePct: number;
}

export interface PriceBand {
  label: string;
  /** Tickets sold at a unit price inside this band. */
  tickets: number;
  /** What the fee engine charges on a ticket at the middle of this band. */
  feePerTicketKobo: Kobo;
  /** True where the cap is what decides the fee, not the rate. */
  capped: boolean;
}

export interface Analytics {
  /** Whether any paid order exists at all. Everything else is meaningless without it. */
  hasRevenue: boolean;

  /** Twelve months, oldest first. Months with no sales are present and zero. */
  months: MonthPoint[];

  grossAllKobo: Kobo;
  feesAllKobo: Kobo;
  takeAllPct: number | null;

  /** This calendar month against the last, on fees. Null when there is no prior month. */
  feesThisMonthKobo: Kobo;
  feesLastMonthKobo: Kobo;

  paidOrders: number;
  freeRegistrations: number;
  ticketsPaid: number;
  ticketsFree: number;

  /** Gross ÷ paid orders. What a buyer spends in one go. */
  avgOrderKobo: Kobo;
  /** Fees ÷ paid tickets. What CrowdBuzz earns per admission sold. */
  avgFeePerTicketKobo: Kobo;

  /* ── Who the revenue depends on ────────────────────────────── */
  topOrganisers: OrganiserShare[];
  /** The largest single organiser's share of all fees. Concentration risk. */
  topOneSharePct: number | null;
  /** The largest three together. */
  topThreeSharePct: number | null;
  organisersWithRevenue: number;

  /* ── Whether organisers come back ──────────────────────────── */
  organisersPublished: number;
  organisersPublishedTwice: number;
  /** Of those who published once, the share who published again. */
  repeatRatePct: number | null;
  /** Median days between a first published event and a second. Null with fewer than one repeat. */
  medianDaysToSecond: number | null;

  /* ── Where the pricing lands ───────────────────────────────── */
  priceBands: PriceBand[];
  /** Tickets sold at a price where the cap, not the rate, sets the fee. */
  ticketsAtCappedPrice: number;

  /**
   * Traffic and checkout drop-off, which this cannot answer.
   *
   * Recording it needs page events, and the product does not emit any. A
   * guess would be worse than the gap, so the screen says what is missing
   * rather than filling it in.
   */
  funnel: { available: false; why: string };
}

export async function getAnalytics(now = new Date()): Promise<Analytics> {
  const admin = createAdminClient();

  const [{ data: orderRows }, { data: eventRows }, { data: tierRows }, { data: profileRows }] =
    await Promise.all([
      admin
        .from("orders")
        .select("gross_kobo, platform_fee_kobo, quantity, paid_at, created_at, creator_id, status")
        .eq("status", "paid")
        .limit(20000),
      admin
        .from("events")
        .select("id, creator_id, publish_status, published_at, created_at")
        .limit(20000),
      admin
        .from("ticket_types")
        .select("price_kobo, sold_count, status")
        .limit(20000),
      admin.from("profiles").select("id, handle, box_office_name, first_name").limit(20000),
    ]);

  const orders = orderRows ?? [];
  const events = eventRows ?? [];
  const tiers = tierRows ?? [];

  /* ── The twelve-month series ─────────────────────────────────
     Keyed by year-month so a gap in trading does not silently shift
     every later month one place to the left, which is what indexing by
     "how many rows have I seen" would do. */
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const buckets = new Map<string, MonthPoint>();
  const order: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = key(d);
    order.push(k);
    buckets.set(k, {
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      grossKobo: 0, feesKobo: 0, paidOrders: 0, ticketsPaid: 0, takePct: null,
    });
  }

  let grossAll = 0, feesAll = 0;
  let paidOrders = 0, freeRegistrations = 0, ticketsPaid = 0, ticketsFree = 0;
  const feesByCreator = new Map<string, number>();

  const thisMonthKey = key(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthKey = key(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let feesThisMonth = 0, feesLastMonth = 0;

  for (const o of orders) {
    const gross = toNum(o.gross_kobo);
    const fee = toNum(o.platform_fee_kobo);
    const qty = Math.max(1, toNum(o.quantity) || 1);

    // The split that keeps every rate on this page honest.
    if (gross <= 0) {
      freeRegistrations += 1;
      ticketsFree += qty;
      continue;
    }

    paidOrders += 1;
    ticketsPaid += qty;
    grossAll += gross;
    feesAll += fee;

    const creator = (o.creator_id as string) ?? "";
    if (creator) feesByCreator.set(creator, (feesByCreator.get(creator) ?? 0) + fee);

    const stamp = (o.paid_at as string) ?? (o.created_at as string);
    if (!stamp) continue;
    const when = new Date(stamp);
    if (Number.isNaN(when.getTime())) continue;

    const k = key(when);
    if (k === thisMonthKey) feesThisMonth += fee;
    if (k === lastMonthKey) feesLastMonth += fee;

    const b = buckets.get(k);
    if (b) {
      b.grossKobo += gross;
      b.feesKobo += fee;
      b.paidOrders += 1;
      b.ticketsPaid += qty;
    }
  }

  for (const k of order) {
    const b = buckets.get(k)!;
    b.takePct = b.grossKobo > 0 ? (b.feesKobo / b.grossKobo) * 100 : null;
  }

  /* ── Concentration ───────────────────────────────────────────
     A young marketplace usually IS one organiser, and knowing by how
     much is the difference between a business and a client. */
  const nameOf = new Map<string, { name: string; handle: string | null }>();
  for (const p of profileRows ?? []) {
    nameOf.set(p.id as string, {
      name:
        (p.box_office_name as string) ||
        (p.first_name as string) ||
        (p.handle as string) ||
        "An organiser",
      handle: (p.handle as string) ?? null,
    });
  }

  const ranked = Array.from(feesByCreator.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, fee]) => ({
      name: nameOf.get(id)?.name ?? "An organiser",
      handle: nameOf.get(id)?.handle ?? null,
      feesKobo: fee,
      sharePct: feesAll > 0 ? (fee / feesAll) * 100 : 0,
    }));

  const topOrganisers = ranked.slice(0, 6);

  /* ── Do organisers come back ─────────────────────────────────
     Counted on PUBLISHED events only. A draft is an intention, and
     counting intentions as repeat business is how a retention number
     becomes a comforting lie. */
  const publishedByCreator = new Map<string, number[]>();
  for (const e of events) {
    if (e.publish_status !== "published") continue;
    const creator = (e.creator_id as string) ?? "";
    if (!creator) continue;
    const stamp = (e.published_at as string) ?? (e.created_at as string);
    const when = stamp ? new Date(stamp).getTime() : NaN;
    if (Number.isNaN(when)) continue;
    const list = publishedByCreator.get(creator) ?? [];
    list.push(when);
    publishedByCreator.set(creator, list);
  }

  let organisersPublishedTwice = 0;
  const gaps: number[] = [];
  for (const times of Array.from(publishedByCreator.values())) {
    if (times.length < 2) continue;
    organisersPublishedTwice += 1;
    times.sort((a, b) => a - b);
    gaps.push(Math.round((times[1] - times[0]) / 86400000));
  }
  gaps.sort((a, b) => a - b);
  const medianDaysToSecond =
    gaps.length === 0
      ? null
      : gaps.length % 2
        ? gaps[(gaps.length - 1) / 2]
        : Math.round((gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2);

  const organisersPublished = publishedByCreator.size;

  /* ── Where the pricing lands ─────────────────────────────────
     The cap is the pitch, so where tickets actually sit relative to it
     is the most load-bearing fact about the fee model. Read from tiers
     rather than from orders because an order can mix tiers, and a
     blended unit price would put tickets in bands nobody sold. */
  const BANDS: { label: string; lo: number; hi: number; mid: number }[] = [
    { label: "Free", lo: 0, hi: 0, mid: 0 },
    { label: "Under ₦2,000", lo: 1, hi: PLATFORM_FEE_FREE_BELOW_KOBO - 1, mid: 100_000 },
    { label: "₦2,000–₦10,000", lo: PLATFORM_FEE_FREE_BELOW_KOBO, hi: 1_000_000, mid: 600_000 },
    { label: "₦10,000–₦25,000", lo: 1_000_001, hi: 2_500_000, mid: 1_750_000 },
    { label: "₦25,000–₦75,000", lo: 2_500_001, hi: 7_500_000, mid: 5_000_000 },
    { label: "Over ₦75,000", lo: 7_500_001, hi: Number.MAX_SAFE_INTEGER, mid: 15_000_000 },
  ];

  const bandTickets = new Array(BANDS.length).fill(0);
  let ticketsAtCappedPrice = 0;

  /*
   * THE FEE COMES FROM cappedFeeKobo, NOT FROM THE ARITHMETIC REPEATED
   * HERE. A second copy of "rate, then cap, then free floor" is a second
   * pricing model that agrees with the real one right up until somebody
   * changes one of the three — and then this screen quietly reports a fee
   * the product does not charge. The rate, the cap and the floor live in
   * lib/money.ts and only there.
   *
   * `byRate` below is the uncapped fee, and it exists only to answer
   * "did the cap decide this one?", which is a question about the model
   * rather than a price shown to anybody.
   */
  const byRateKobo = (unit: number) =>
    Math.floor((unit * DEFAULT_PLATFORM_FEE_VALUE) / 10_000);

  for (const t of tiers) {
    const sold = toNum(t.sold_count);
    if (sold <= 0) continue;
    const unit = toNum(t.price_kobo);
    const i = BANDS.findIndex((b) => unit >= b.lo && unit <= b.hi);
    if (i >= 0) bandTickets[i] += sold;

    if (unit >= PLATFORM_FEE_FREE_BELOW_KOBO && byRateKobo(unit) > platformFeeCapKobo(unit)) {
      ticketsAtCappedPrice += sold;
    }
  }

  const priceBands: PriceBand[] = BANDS.map((b, i) => ({
    label: b.label,
    tickets: bandTickets[i],
    feePerTicketKobo: cappedFeeKobo(b.mid, DEFAULT_PLATFORM_FEE_VALUE),
    capped:
      b.mid >= PLATFORM_FEE_FREE_BELOW_KOBO && byRateKobo(b.mid) > platformFeeCapKobo(b.mid),
  }));

  return {
    hasRevenue: paidOrders > 0,
    months: order.map((k) => buckets.get(k)!),

    grossAllKobo: grossAll,
    feesAllKobo: feesAll,
    takeAllPct: grossAll > 0 ? (feesAll / grossAll) * 100 : null,

    feesThisMonthKobo: feesThisMonth,
    feesLastMonthKobo: feesLastMonth,

    paidOrders,
    freeRegistrations,
    ticketsPaid,
    ticketsFree,

    avgOrderKobo: paidOrders > 0 ? Math.round(grossAll / paidOrders) : 0,
    avgFeePerTicketKobo: ticketsPaid > 0 ? Math.round(feesAll / ticketsPaid) : 0,

    topOrganisers,
    topOneSharePct: ranked.length > 0 ? ranked[0].sharePct : null,
    topThreeSharePct:
      ranked.length > 0
        ? ranked.slice(0, 3).reduce((sum, r) => sum + r.sharePct, 0)
        : null,
    organisersWithRevenue: ranked.length,

    organisersPublished,
    organisersPublishedTwice,
    repeatRatePct:
      organisersPublished > 0 ? (organisersPublishedTwice / organisersPublished) * 100 : null,
    medianDaysToSecond,

    priceBands,
    ticketsAtCappedPrice,

    funnel: {
      available: false,
      why: "Traffic and checkout drop-off need page events, and the product does not record any yet. Nothing here estimates them.",
    },
  };
}
