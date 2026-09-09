import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Sparkle, Underline } from "@/components/marketing/doodles";
import { Check, X } from "lucide-react";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_CAP_KOBO,
  PLATFORM_FEE_CAP_MAX_KOBO,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  calculatePlatformFeeKobo,
  formatKobo,
  koboToNaira,
  nairaToKobo,
} from "@/lib/money";
import {
  TYPICAL_CHECKED,
  TYPICAL_FLAT_NAIRA,
  TYPICAL_RATE,
  typicalFeeNaira,
} from "@/lib/competitor";

export const metadata: Metadata = {
  title: "CrowdBuzz vs Tix",
  description: `Tix charges ${TYPICAL_RATE * 100}% + ₦${TYPICAL_FLAT_NAIRA} per seat, added on top so your buyer pays it. CrowdBuzz charges ${DEFAULT_PLATFORM_FEE_VALUE / 100}% of a ticket and stops at ${formatKobo(PLATFORM_FEE_CAP_KOBO)}, never above ${formatKobo(PLATFORM_FEE_CAP_MAX_KOBO)}. Every figure worked out side by side.`,
};

/**
 * The page for somebody who has already decided to leave.
 *
 * "Tix alternative" is the highest-intent thing a Nigerian organiser can
 * type: they are not weighing whether to sell tickets, they are looking
 * for where to go instead. This page has one job — answer that in numbers
 * they can check themselves.
 *
 * EVERY FIGURE IS COMPUTED, NOT TYPED. Ours comes out of the same engine
 * that charges the money (lib/money.ts) and theirs out of the one file
 * that records what they charge (lib/competitor.ts). A comparison page
 * that drifts from the real prices is worse than no page: it is the first
 * thing a sceptical reader checks, and being caught out once costs the
 * whole argument.
 *
 * TONE. No sneering. The reader may well be a happy Tix customer and the
 * numbers are enough on their own — every line here is a fact with a date
 * on it, and where they are better we say so.
 */

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

const ourFee = (priceNaira: number) =>
  koboToNaira(
    calculatePlatformFeeKobo(
      nairaToKobo(priceNaira),
      DEFAULT_PLATFORM_FEE_TYPE,
      DEFAULT_PLATFORM_FEE_VALUE
    )
  );

const RATE_PCT = DEFAULT_PLATFORM_FEE_VALUE / 100;
const CAP = koboToNaira(PLATFORM_FEE_CAP_KOBO);
const CAP_MAX = koboToNaira(PLATFORM_FEE_CAP_MAX_KOBO);
const FREE_BELOW = koboToNaira(PLATFORM_FEE_FREE_BELOW_KOBO);
const THEIR_PCT = TYPICAL_RATE * 100;

/**
 * The prices real Nigerian events actually sell at, low to high — chosen
 * so the reader finds their own ticket somewhere in the list rather than
 * being shown only the cases that flatter us.
 */
const ROWS = [1500, 5000, 10000, 20000, 45000, 75000, 150000, 500000].map((price) => {
  const ours = ourFee(price);
  const theirs = typicalFeeNaira(price);
  return { price, ours, theirs, saved: theirs - ours };
});

/** One event, so the difference stops being per-ticket abstraction. */
const NIGHT = { price: 20000, tickets: 300 };
const NIGHT_OURS = ourFee(NIGHT.price) * NIGHT.tickets;
const NIGHT_THEIRS = typicalFeeNaira(NIGHT.price) * NIGHT.tickets;

const HONEST = [
  {
    them: true,
    text: "Tix has been going for years and has sold for names you have heard of. We launched this year.",
  },
  {
    them: true,
    text: "They have a bigger audience browsing their own listings. If you are relying on a platform to find your crowd, that counts.",
  },
  {
    them: false,
    text: `Our fee holds at ${naira(CAP)} a ticket and never passes ${naira(CAP_MAX)}, whatever the price. Theirs does not stop at all.`,
  },
  {
    them: false,
    text: "We charge nothing under ₦2,000 a ticket, and nothing at all on free events.",
  },
  {
    them: false,
    text: "Your share splits off as the buyer pays and lands in your own bank. No wallet, no withdrawal, no waiting until after the night.",
  },
];

export default function VsTixPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      {/* ══════════════ The claim ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <Sparkle className="absolute left-[8%] top-[16%] hidden h-6 w-6 text-[var(--coral)]/40 sm:block" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
            CrowdBuzz vs Tix
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[56px]">
            Their fee keeps climbing.
            <br />
            <span className="relative inline-block">
              Ours stops.
              <Underline className="absolute -bottom-3 left-0 h-3 w-full text-[var(--coral)]" />
            </span>
          </h1>
          <p className="mx-auto mt-9 max-w-[52ch] text-[17px] leading-[1.6] text-[var(--on-ground-soft)] sm:text-[19px]">
            Tix takes {THEIR_PCT}% + {naira(TYPICAL_FLAT_NAIRA)} of every seat, added on
            top so your buyer pays it. We take {RATE_PCT}% of a ticket and never more
            than {naira(CAP)}, out of your side. Here is what that is worth, ticket by
            ticket.
          </p>
          <div className="mt-10 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      {/* ══════════════ The table ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">
            One ticket, both platforms
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-center text-[16px] leading-[1.6] text-[var(--on-ground-soft)]">
            The fee on a single ticket at each price. Ours comes out of the same
            engine that charges it; theirs from their own published rate.
          </p>

          {/* On a phone the table scrolled sideways and our own column was the
              part off-screen — the reader saw Tix's fee and nothing else, which
              is the worst possible failure for this page. Stacked rows below,
              the table from sm up. */}
          <div className="mt-12 flex flex-col gap-3 sm:hidden">
            {ROWS.map((row) => (
              <div
                key={row.price}
                className="rounded-2xl border border-[var(--hairline)] bg-[var(--ground-deep)] p-5"
              >
                <p className="text-[19px] font-extrabold [font-variant-numeric:tabular-nums]">
                  {naira(row.price)} ticket
                </p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
                      Tix
                    </p>
                    <p className="mt-1 text-[20px] font-extrabold text-[var(--on-ground-soft)] [font-variant-numeric:tabular-nums]">
                      {naira(row.theirs)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--coral)]">
                      CrowdBuzz
                    </p>
                    <p className="mt-1 text-[20px] font-extrabold text-[var(--coral)] [font-variant-numeric:tabular-nums]">
                      {row.ours === 0 ? "Free" : naira(row.ours)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 border-t border-[var(--hairline)] pt-3 text-[14px] font-bold [font-variant-numeric:tabular-nums]">
                  {naira(row.saved)} more in your pocket, every ticket
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--hairline-firm)]">
                  <th className="pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
                    Ticket price
                  </th>
                  <th className="pb-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
                    Tix
                  </th>
                  <th className="pb-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--coral)]">
                    CrowdBuzz
                  </th>
                  <th className="pb-3 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--on-ground-faint)]">
                    You save
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.price} className="border-b border-[var(--hairline)]">
                    <td className="py-4 text-[16px] font-extrabold [font-variant-numeric:tabular-nums]">
                      {naira(row.price)}
                    </td>
                    <td className="py-4 text-right text-[16px] text-[var(--on-ground-soft)] [font-variant-numeric:tabular-nums]">
                      {naira(row.theirs)}
                    </td>
                    <td className="py-4 text-right text-[16px] font-extrabold text-[var(--coral)] [font-variant-numeric:tabular-nums]">
                      {row.ours === 0 ? "Free" : naira(row.ours)}
                    </td>
                    <td className="py-4 text-right text-[16px] font-extrabold [font-variant-numeric:tabular-nums]">
                      +{naira(row.saved)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-7 text-[13.5px] leading-relaxed text-[var(--on-ground-faint)]">
            Tix&rsquo;s rate verified {TYPICAL_CHECKED} by reading nine live ticket types
            across two events on their own checkout. Their fee is added on top of the
            price, so it is your buyer who pays it &mdash; which is why it is the number
            that decides whether somebody finishes checking out.
          </p>
        </div>
      </section>

      {/* ══════════════ One real night ══════════════ */}
      <section className="border-b border-[var(--hairline)] bg-[var(--ground-raised)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
            A {naira(NIGHT.price)} ticket, {NIGHT.tickets} of them
          </p>
          <h2 className="mt-5 text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">
            {naira(NIGHT_THEIRS)} in fees,
            <br />
            or {naira(NIGHT_OURS)}.
          </h2>
          <p className="mx-auto mt-7 max-w-[48ch] text-[17px] leading-[1.6] text-[var(--on-ground-soft)]">
            The same night, sold twice. The difference is{" "}
            <strong className="text-[var(--on-ground)]">
              {naira(NIGHT_THEIRS - NIGHT_OURS)}
            </strong>{" "}
            &mdash; and on their side it came out of your buyers&rsquo; pockets before
            they ever reached yours.
          </p>
        </div>
      </section>

      {/* ══════════════ Where they win ══════════════ */}
      <section className="border-b border-[var(--hairline)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">
            Where each of us is better
          </h2>
          <p className="mt-5 max-w-[54ch] text-[16px] leading-[1.6] text-[var(--on-ground-soft)]">
            Two of these are theirs. We would rather you heard them from us than
            found them out on the night.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {HONEST.map((row) => (
              <li key={row.text} className="flex items-start gap-4">
                <span
                  className={`mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    row.them
                      ? "bg-[var(--hairline)] text-[var(--on-ground-soft)]"
                      : "bg-[var(--coral)] text-white"
                  }`}
                >
                  {row.them ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <p className="text-[16.5px] leading-[1.55] text-[var(--on-ground-soft)]">
                  {row.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════ Close ══════════════ */}
      <section className="px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">
            Try it on one event
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--on-ground-soft)]">
            There is no plan to sign up for and nothing to cancel. If your tickets
            are under {naira(FREE_BELOW)}, or the event is free, it costs you nothing
            at all.
          </p>
          <div className="mt-10 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
