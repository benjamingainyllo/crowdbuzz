/**
 * Money in CrowdBuzz is ALWAYS an integer number of kobo.
 *
 * Never store or compute money as naira, as a float, or as `numeric`.
 * Every conversion and every bit of formatting goes through this file —
 * no ad-hoc `* 100` or `/ 100` anywhere else in the codebase.
 */

/** An integer number of kobo. 100 kobo = ₦1. */
export type Kobo = number;

const KOBO_PER_NAIRA = 100;

export function isKobo(value: unknown): value is Kobo {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** Convert a naira amount (from user input or an external API) into kobo. */
export function nairaToKobo(naira: number): Kobo {
  if (!Number.isFinite(naira)) {
    throw new Error(`Cannot convert non-finite naira value: ${naira}`);
  }
  // Round rather than truncate so 19.99 * 100 floating point noise
  // (1998.9999...) doesn't silently lose a kobo.
  return Math.round(naira * KOBO_PER_NAIRA);
}

/** Convert kobo to naira. For DISPLAY and for provider APIs only — never for storage. */
export function koboToNaira(kobo: Kobo): number {
  assertKobo(kobo);
  return kobo / KOBO_PER_NAIRA;
}

/**
 * Parse a free-text naira input ("5,000", "₦5000", "5000.50") into kobo.
 * Returns null when the input isn't a usable amount, so callers can show a
 * validation message instead of silently charging the wrong thing.
 */
export function parseNairaInput(input: string): Kobo | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (cleaned === "" || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const naira = Number(cleaned);
  if (!Number.isFinite(naira) || naira < 0) return null;
  return nairaToKobo(naira);
}

/** Format kobo for display: 500000 -> "₦5,000". Whole naira unless kobo remain. */
export function formatKobo(kobo: Kobo): string {
  assertKobo(kobo);
  const naira = kobo / KOBO_PER_NAIRA;
  const hasFraction = kobo % KOBO_PER_NAIRA !== 0;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Fee model, configured per creator so it can change without a migration. */
export type PlatformFeeType = "percentage" | "flat" | "banded" | "capped";

/**
 * CrowdBuzz takes 4.7% of a ticket, and never more than ₦5,000.
 *
 * THE CAP IS A STAIRCASE, NOT A LINE. 4.7% of the ticket, then held at
 * ₦3,500; ₦4,000 once the ticket reaches ₦150,000; ₦5,000 once it reaches
 * ₦500,000. Nothing ever exceeds ₦5,000, which is the sentence that gets
 * repeated — the competition takes ₦40,100 on a ₦500,000 table, eight
 * times as much.
 *
 * WHY THIS SHAPE. The model before this was four flat bands charged
 * INSTEAD of a rate, and bands like that have an unavoidable fault: the
 * fee jumps at every boundary. A ₦29,999 ticket cost the organiser ₦450
 * and a ₦30,000 one cost ₦1,500 — three times as much for one naira more,
 * which across 200 tickets was ₦210,000 for pricing a night ₦1 higher. It
 * also meant the EFFECTIVE rate sawtoothed between 1.25% and 10%.
 *
 * A rate with a stepped ceiling keeps the part that mattered: below the
 * first step the fee tracks the price exactly, so there is no boundary to
 * fall off where most tickets actually sell. The steps only exist above
 * ₦150,000, where they move the fee by ₦500 at a time on a ticket costing
 * more than that — a 0.33% step, not a 233% one.
 *
 * IT IS STILL A STEP, AND THAT IS THE COST OF THIS SHAPE. A ₦149,999
 * ticket pays ₦3,500 and a ₦150,000 one pays ₦4,000. Chosen deliberately
 * on 9 September 2026, with that trade-off on the table, in exchange for
 * premium events (retreats, VIP tables, ₦150,000 conferences) paying
 * closer to their weight than a flat ₦3,500 would have taken.
 *
 * WHAT MOVED, AND WHEN. 9 September 2026, from 4% capped flat at ₦3,000,
 * by the founder's decision. The rate is where the revenue is — it
 * touches every ticket, and 4% -> 4.7% is worth roughly ₦1.8m across a
 * modelled first year. The cap steps earn nothing below ₦74,000 a ticket.
 * Changed before a single organiser had signed up, which is the only
 * cheap moment to change a price.
 *
 * FOR REFERENCE, WHAT THE COMPETITION ACTUALLY CHARGES. Tix.Africa takes
 * 8% + ₦100, added on top so the buyer pays it, and charges it once PER
 * SEAT on a group ticket — their "Squad of 4" at ₦56,000 carries ₦4,880
 * in fees. Verified 1 September 2026 by reading nine live ticket types
 * across two events on their own checkout; every one matched 8% + ₦100
 * per seat exactly.
 *
 * Do not "correct" this to 5% again. An earlier version of this comment
 * did, on no evidence, and the wrong figure went out on the pricing page
 * and the calculator for weeks — understating our own advantage by about
 * half. If you change it, check a live checkout first and say so here.
 */
export const DEFAULT_PLATFORM_FEE_TYPE: PlatformFeeType = "capped";
/** Basis points. 470 = 4.70%. Per creator, so a deal can be cut. */
export const DEFAULT_PLATFORM_FEE_VALUE = 470;

/**
 * The ceiling on a single ticket, as a staircase.
 *
 * Each step applies while the unit price is BELOW its `belowKobo`. The
 * last step is Infinity, so there is always a match and the fee can never
 * fall through to uncapped.
 *
 * ORDER MATTERS AND MUST STAY ASCENDING. Read top to bottom, first match
 * wins; a step inserted out of order would silently shadow the ones after
 * it. Keep the caps ascending too — a step that lowered the cap as the
 * ticket got more expensive would let an organiser pay less by charging
 * more.
 */
export const PLATFORM_FEE_CAP_STEPS: ReadonlyArray<{
  /** Applies while the unit price is BELOW this, in kobo. */
  readonly belowKobo: number;
  readonly capKobo: Kobo;
}> = [
  { belowKobo: 15_000_000, capKobo: 350_000 },  // under ₦150,000       -> ₦3,500
  { belowKobo: 50_000_000, capKobo: 400_000 },  // ₦150,000 - ₦500,000  -> ₦4,000
  { belowKobo: Infinity, capKobo: 500_000 },    // ₦500,000 and up      -> ₦5,000
];

/**
 * The cap that applies to a ticket at this price.
 *
 * One function rather than each caller walking the table, because a page
 * that walked it slightly differently would quote a fee we do not charge.
 */
export function platformFeeCapKobo(unitPriceKobo: Kobo): Kobo {
  for (const step of PLATFORM_FEE_CAP_STEPS) {
    if (unitPriceKobo < step.belowKobo) return step.capKobo;
  }
  // Unreachable while the last step is Infinity. A table edited badly
  // should charge the top cap rather than nothing at all.
  return PLATFORM_FEE_CAP_STEPS[PLATFORM_FEE_CAP_STEPS.length - 1].capKobo;
}

/**
 * The first step: what an ordinary ticket is capped at.
 *
 * This is the number the marketing pages quote as "capped at", because
 * it is the one almost every real ticket meets. It is NOT the most we
 * ever take — see PLATFORM_FEE_CAP_MAX_KOBO, and never write "never more
 * than" against this one.
 */
export const PLATFORM_FEE_CAP_KOBO: Kobo = PLATFORM_FEE_CAP_STEPS[0].capKobo; // ₦3,500

/**
 * The most we will ever take from one ticket, at any price.
 *
 * THIS is the "never more than" number. Copy that promises a ceiling has
 * to use this one, or it is promising something we do not do.
 */
export const PLATFORM_FEE_CAP_MAX_KOBO: Kobo =
  PLATFORM_FEE_CAP_STEPS[PLATFORM_FEE_CAP_STEPS.length - 1].capKobo; // ₦5,000

/**
 * Below this, selling is free. Campus nights, church programmes and
 * community events cost us almost nothing to carry and are how a lot of
 * organisers meet the product.
 */
export const PLATFORM_FEE_FREE_BELOW_KOBO: Kobo = 200_000; // ₦2,000

/**
 * HOW THE FEE IS SAID OUT LOUD. One place, because it is now a sentence
 * with a condition in it and every page that rephrased it by hand got a
 * slightly different version — some of them false.
 *
 * The trap this exists to close: "never more than ₦3,500" is NOT true.
 * ₦3,500 is the first step of the cap, not the ceiling. An unqualified
 * "never more than" has to quote PLATFORM_FEE_CAP_MAX_KOBO or it promises
 * something we do not do on a ₦200,000 ticket.
 */
export const PLATFORM_FEE_RATE_LABEL = `${DEFAULT_PLATFORM_FEE_VALUE / 100}%`;
export const PLATFORM_FEE_CAP_LABEL = formatKobo(PLATFORM_FEE_CAP_KOBO);
export const PLATFORM_FEE_CAP_MAX_LABEL = formatKobo(PLATFORM_FEE_CAP_MAX_KOBO);
export const PLATFORM_FEE_FREE_BELOW_LABEL = formatKobo(PLATFORM_FEE_FREE_BELOW_KOBO);

/**
 * For a badge, a nav strip, a pill — anywhere with no room to qualify.
 * Quotes the true ceiling, so it cannot be wrong at any ticket price.
 */
export const PLATFORM_FEE_BADGE = `${PLATFORM_FEE_RATE_LABEL} a ticket, never more than ${PLATFORM_FEE_CAP_MAX_LABEL}`;

/**
 * For anywhere with a line to spare: the cap most tickets meet, and the
 * ceiling nothing passes.
 */
export const PLATFORM_FEE_SENTENCE = `${PLATFORM_FEE_RATE_LABEL} of a ticket, capped at ${PLATFORM_FEE_CAP_LABEL} — and never more than ${PLATFORM_FEE_CAP_MAX_LABEL}, however expensive the ticket.`;

/**
 * The fee for one ticket at this price, under the capped model.
 *
 * Rounded down, so a rounding error can never take more than the stated
 * rate. The cap and the free floor are applied here rather than by each
 * caller, because they are the pricing promise and must hold everywhere.
 */
export function cappedFeeKobo(unitPriceKobo: Kobo, rateBps: number): Kobo {
  assertKobo(unitPriceKobo);
  if (unitPriceKobo < PLATFORM_FEE_FREE_BELOW_KOBO) return 0;
  const fee = Math.floor((unitPriceKobo * Math.round(rateBps)) / 10_000);
  return Math.min(fee, platformFeeCapKobo(unitPriceKobo));
}

/**
 * The cheapest ticket on which the cap actually bites.
 *
 * WHY THIS IS A FUNCTION. This number was written by hand as "₦75,000" on
 * the home page and the calculator, and hand-written numbers rot: the
 * moment the rate or the cap moves, every page still says the old hinge
 * and nobody notices, because nothing fails. Derived, it cannot disagree
 * with the fee the buyer is actually charged.
 *
 * Returns Infinity at a zero rate, where the cap can never be reached.
 * That is not a Kobo value — callers must check before formatting it.
 */
export function capBitesAtKobo(rateBps: number = DEFAULT_PLATFORM_FEE_VALUE): number {
  const bps = Math.round(rateBps);
  if (bps <= 0) return Infinity;
  // cappedFeeKobo floors, so the hinge is the first whole kobo whose fee
  // reaches the cap — ceil, not round. Measured against the FIRST step:
  // this is where the fee stops tracking the price, which is the thing
  // the sentence on the pricing page is actually about.
  return Math.ceil((PLATFORM_FEE_CAP_STEPS[0].capKobo * 10_000) / bps);
}

/**
 * The same hinge, rounded off for a sentence: "past about ₦74,000".
 *
 * Prose wants a round number, not ₦74,468.09. Rounded to the nearest
 * ₦1,000 and always spoken as "about", so it stays honest either way.
 */
export function capBitesAtLabel(rateBps: number = DEFAULT_PLATFORM_FEE_VALUE): string {
  const kobo = capBitesAtKobo(rateBps);
  if (!Number.isFinite(kobo)) return "never";
  const rounded = Math.round(koboToNaira(Math.ceil(kobo)) / 1000) * 1000;
  return `₦${rounded.toLocaleString("en-NG")}`;
}

/**
 * The superseded band table.
 *
 * Kept because accounts created before the change may still be set to
 * 'banded', and their historical orders have to stay explainable. Nothing
 * new is priced this way — see DEFAULT_PLATFORM_FEE_TYPE above.
 */
export const PLATFORM_FEE_BANDS: ReadonlyArray<{
  /** Applies while the unit price is BELOW this, in kobo. */
  readonly belowKobo: number;
  readonly feeKobo: Kobo;
}> = [
  { belowKobo: 200_000, feeKobo: 0 },           // under ₦2,000  -> free
  { belowKobo: 750_000, feeKobo: 20_000 },      // ₦2,000-₦7,500 -> ₦200
  { belowKobo: 3_000_000, feeKobo: 45_000 },    // ₦7,500-₦30,000 -> ₦450
  { belowKobo: 7_500_000, feeKobo: 150_000 },   // ₦30,000-₦75,000 -> ₦1,500
  { belowKobo: Infinity, feeKobo: 250_000 },    // ₦75,000+      -> ₦2,500
];

/** The band fee for one ticket at this price, in kobo. */
export function bandFeeKobo(unitPriceKobo: Kobo): Kobo {
  assertKobo(unitPriceKobo);
  for (const band of PLATFORM_FEE_BANDS) {
    if (unitPriceKobo < band.belowKobo) return band.feeKobo;
  }
  // Unreachable while the last band is Infinity, but a table edited badly
  // should charge the top rate rather than nothing at all.
  return PLATFORM_FEE_BANDS[PLATFORM_FEE_BANDS.length - 1].feeKobo;
}

/**
 * The platform's cut of a single unit, in kobo.
 *
 *  - "percentage": `value` is BASIS POINTS (900 = 9.00%)
 *  - "flat":       `value` is kobo per unit
 *
 * Always rounds down so we never take more than the configured rate.
 */
export function calculatePlatformFeeKobo(
  grossKobo: Kobo,
  feeType: PlatformFeeType,
  feeValue: number
): Kobo {
  assertKobo(grossKobo);

  // Free is free. We never take a fee on a ticket nobody paid for —
  // a flat fee would otherwise turn a ₦0 RSVP into a charge.
  if (grossKobo === 0) return 0;

  const fee =
    feeType === "capped"
      ? cappedFeeKobo(grossKobo, feeValue)
      : feeType === "banded"
        ? bandFeeKobo(grossKobo)
        : feeType === "flat"
          ? Math.round(feeValue)
          : Math.floor((grossKobo * Math.round(feeValue)) / 10_000);

  // Never take more than the buyer paid.
  return Math.max(0, Math.min(fee, grossKobo));
}

/**
 * The platform's cut of a whole order.
 *
 * This is the one to call at checkout. A flat fee is charged PER TICKET,
 * so it has to see the quantity — computing it from the order total
 * instead would quietly charge one fee for a four-ticket purchase.
 */
export function calculateOrderPlatformFeeKobo(
  unitPriceKobo: Kobo,
  quantity: number,
  feeType: PlatformFeeType,
  feeValue: number
): Kobo {
  assertKobo(unitPriceKobo);

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(`Expected a positive integer quantity, received: ${String(quantity)}`);
  }

  // Charged PER TICKET, so the cap is per ticket too. Capping the whole
  // order at ₦3,500 would make a ten-ticket group nearly free, which is
  // not the promise — the promise is that no single ticket costs more
  // than the cap.
  if (feeType === "flat" || feeType === "banded" || feeType === "capped") {
    return calculatePlatformFeeKobo(unitPriceKobo, feeType, feeValue) * quantity;
  }

  return calculatePlatformFeeKobo(unitPriceKobo * quantity, "percentage", feeValue);
}

function assertKobo(kobo: unknown): asserts kobo is Kobo {
  if (!isKobo(kobo)) {
    throw new Error(`Expected an integer kobo amount, received: ${String(kobo)}`);
  }
}
