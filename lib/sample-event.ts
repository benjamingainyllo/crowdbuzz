import type { PublicCohost, PublicProduct, PublicTicketType } from "@/app/actions/events";

/**
 * A whole event, invented, so the storefront can be looked at.
 *
 * THE STOREFRONT IS THE HALF OF THIS PRODUCT NOBODY CAN SEE WITHOUT A
 * DATABASE. The marketing site renders from nothing, the dashboard renders
 * empty states, but the event page — the one screen a guest actually judges
 * us on, the one that gets pasted into a WhatsApp group — needs a published
 * event, a host, tiers and stock before it draws a single pixel. So it got
 * built and changed repeatedly without anyone laying eyes on it. That is how
 * a screen ends up shipping unlooked-at.
 *
 * `/event/demo` renders the real page, the real components and the real fee
 * arithmetic against this instead of Supabase.
 *
 * The id is a reserved word and every real event id is a UUID, so "demo" can
 * never shadow a real event. See sampleAllowed below for why this is reachable
 * on the live site as well.
 *
 * The numbers are chosen to exercise the awkward cases rather than the happy
 * one: a sold-out tier, an unlimited tier, a tier that has not opened yet, a
 * tier priced under the free floor, and one priced high enough to hit the
 * cap. If the page looks right against this, it looks right.
 */

export const SAMPLE_EVENT_ID = "demo";

/**
 * Reachable on the live site too, deliberately.
 *
 * It started development-only, which was the cautious call and the wrong
 * one: it meant the owner of this product could not look at his own
 * storefront until somebody had published a real event, so a whole
 * afternoon's work on the event page was invisible to him. A tool you can
 * only use on a laptop with a checkout of the code is not a tool he has.
 *
 * The safety comes from the shape of it instead. The id is a reserved word,
 * never a UUID, so it cannot shadow a real event. Nothing links to it —
 * Explore reads the database and this is not in the database. The page is
 * told not to be indexed, wears a banner saying what it is, and cannot take
 * money. It is a showroom, not a listing.
 */
export const sampleAllowed = () => true;

/** Far enough out that the countdown never reads "today" while developing. */
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function isoInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const SAMPLE_TIERS: PublicTicketType[] = [
  {
    id: "tier-early",
    name: "Early bird",
    description: "Gone. Kept here so the sold-out state is never unlooked-at.",
    priceKobo: 1_500_000,
    maxPerOrder: 6,
    soldOut: true,
    remaining: 0,
    notYetOpen: false,
    closed: false,
    available: false,
    salesStart: null,
  },
  {
    id: "tier-regular",
    name: "Regular",
    description: "Entry, and the rooftop until 2am.",
    priceKobo: 2_500_000,
    maxPerOrder: 8,
    soldOut: false,
    remaining: 47,
    notYetOpen: false,
    closed: false,
    available: true,
    salesStart: null,
  },
  {
    id: "tier-table",
    name: "Table for six",
    description: "A table, a bottle, and somewhere to put your drink down.",
    priceKobo: 45_000_000,
    maxPerOrder: 2,
    soldOut: false,
    remaining: 4,
    notYetOpen: false,
    closed: false,
    available: true,
    salesStart: null,
  },
  {
    id: "tier-door",
    name: "On the door",
    description: "Opens on the night, if anything is left.",
    priceKobo: 3_500_000,
    maxPerOrder: 4,
    soldOut: false,
    remaining: null,
    notYetOpen: true,
    closed: false,
    available: false,
    salesStart: isoInDays(19),
  },
];

const SAMPLE_PRODUCTS: PublicProduct[] = [
  {
    id: "merch-tee",
    name: "Detty December tee",
    description: "Heavyweight cotton, printed in Yaba.",
    priceKobo: 1_200_000,
    imageUrl: null,
    variants: ["S", "M", "L", "XL"],
    maxPerOrder: 3,
    remaining: 22,
    soldOut: false,
  },
  {
    id: "merch-cap",
    name: "Cap",
    description: null,
    priceKobo: 800_000,
    imageUrl: null,
    variants: null,
    maxPerOrder: 2,
    remaining: 0,
    soldOut: true,
  },
];

const SAMPLE_COHOSTS: PublicCohost[] = [
  { id: "co-1", name: "Tolu A.", handle: "tolu", avatarUrl: null },
  { id: "co-2", name: "Sound by MAJR", handle: null, avatarUrl: null },
];

/** Shaped exactly like a row out of `events`, because the page reads it raw. */
export function sampleEventRow() {
  return {
    id: SAMPLE_EVENT_ID,
    creator_id: "sample-host",
    title: "Detty December on the Roof",
    description:
      "Last one of the year. Doors at 9, the good set starts at 11, and we are on the roof until the sun makes it awkward. Bring the friend who always says they will come and never does.",
    date: inDays(21),
    time: "21:00",
    location: "Victoria Island, Lagos",
    cover_image_url: null,
    publish_status: "published",
    price_kobo: 2_500_000,
    pass_fee_to_buyer: false,
    title_style: "marker",
    capacity: 300,
    created_at: isoInDays(-34),
  };
}

export function sampleEvent() {
  return {
    success: true as const,
    event: sampleEventRow(),
    host: {
      handle: "benjamin",
      first_name: "Benjamin",
      last_name: "G.",
      avatar_url: null,
    },
    ticketTypes: SAMPLE_TIERS,
    products: SAMPLE_PRODUCTS,
    cohosts: SAMPLE_COHOSTS,
  };
}
