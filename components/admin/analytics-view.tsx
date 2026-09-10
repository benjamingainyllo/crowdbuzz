import { formatKobo, PLATFORM_FEE_RATE_LABEL, PLATFORM_FEE_CAP_MAX_LABEL } from "@/lib/money";
import { panel, label, PageHead, Empty, Scroll, th, td, tdNum } from "@/components/admin/ui";
import type { Analytics } from "@/lib/admin-analytics";

/**
 * What is actually happening to the business.
 *
 * FOUR QUESTIONS, IN THE ORDER THEY MATTER. Is the fee income growing;
 * does it depend on one person; do organisers come back; and is the
 * pricing landing where it was designed to. Anything that does not answer
 * one of those is not on this screen — a console page showing twenty
 * numbers is a page nobody reads twice.
 *
 * NOTHING HERE IS ESTIMATED. Every figure comes from rows, counted in
 * lib/admin-analytics.ts. Where the data cannot answer a question this
 * says so in place of the chart, because a plausible-looking guess on
 * this page becomes a decision later.
 *
 * SPLIT FROM THE PAGE so the layout can be rendered against made-up
 * figures in a browser without a database — which is the only way to find
 * out that a twelve-month chart with one trading month looks broken, or
 * that a 96% concentration warning wraps badly, before it is live.
 */

function pct(v: number | null, dp = 1): string {
  return v === null ? "—" : `${v.toFixed(dp)}%`;
}

/**
 * The twelve-month bars.
 *
 * Bars rather than a line, because a month with no trading is a real fact
 * about a young platform and a line drawn through it invents a slope
 * between two points that were never connected. A zero month here is an
 * empty column, which is what it was.
 *
 * Scaled to the largest month, and the scale is stated — an unlabelled
 * bar chart is a shape, not a figure.
 */
function MonthBars({
  months,
}: {
  months: { label: string; grossKobo: number; feesKobo: number; takePct: number | null }[];
}) {
  const peak = Math.max(1, ...months.map((m) => m.grossKobo));

  return (
    <div className={`${panel} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={label}>Fees and volume, by month</p>
        <p className="text-[12px] text-[var(--dl-ink-faint)]">
          Tallest bar = {formatKobo(peak)} moved through
        </p>
      </div>

      {/* items-stretch, NOT items-end, and that is the whole chart working
          or not. Each bar's height is a percentage, and a percentage
          height needs an ancestor with a definite one. With items-end the
          columns are sized by their content instead of filling this box,
          so every bar resolved its percentage against nothing and came
          out at zero — a chart with a legend, labels and no bars. The
          bars sit on the floor because the column below is items-end;
          this row has to stretch. */}
      <div className="mt-5 flex items-stretch gap-1.5 sm:gap-2.5" style={{ height: 168 }}>
        {months.map((m) => {
          const gh = Math.round((m.grossKobo / peak) * 100);
          // The fee bar is drawn inside the gross bar at its true
          // proportion. At a 4.7% take that is a sliver, and a sliver is
          // the honest picture — scaling it up to be visible would be a
          // chart that lies about the take rate.
          const fh = m.grossKobo > 0 ? Math.round((m.feesKobo / m.grossKobo) * 100) : 0;
          return (
            <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t-[6px] bg-[rgba(20,16,24,0.10)]"
                  style={{ height: `${Math.max(gh, m.grossKobo > 0 ? 2 : 0)}%` }}
                  title={`${m.label}: ${formatKobo(m.grossKobo)} gross, ${formatKobo(m.feesKobo)} fees`}
                >
                  {/* The fee sits at the BASE of the column, not the top.
                      It is a slice of the total above it, and a dark band
                      capping a light bar reads as a border on that bar
                      rather than as a share of it — which is the one thing
                      this chart exists to show. */}
                  <div
                    className="w-full bg-[var(--dl-ink)]"
                    style={{ height: `${Math.max(fh, m.feesKobo > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
              <span className="truncate text-[10px] font-bold text-[var(--dl-ink-faint)]">
                {m.label.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-2 text-[12px] text-[var(--dl-ink-soft)]">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--dl-ink)]" /> Your fee
        </span>
        <span className="flex items-center gap-2 text-[12px] text-[var(--dl-ink-soft)]">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[rgba(20,16,24,0.10)]" /> Moved through
        </span>
      </div>
    </div>
  );
}

export function AnalyticsView({ a }: { a: Analytics }) {

  const feeDelta =
    a.feesLastMonthKobo > 0
      ? ((a.feesThisMonthKobo - a.feesLastMonthKobo) / a.feesLastMonthKobo) * 100
      : null;

  return (
    <section className="space-y-6">
      <PageHead
        title="Analytics"
        sub="Every figure here is counted from real orders. Nothing on this page is estimated."
      />

      {!a.hasRevenue ? (
        <div className={`${panel} overflow-hidden`}>
          <Empty
            title="No paid orders yet"
            body="These figures start the moment somebody buys a ticket. Free registrations are counted separately and never as revenue, so a page of free events will keep this empty — which is correct, not broken."
          />
        </div>
      ) : (
        <>
          {/* ── Is it growing ─────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="adm-grad-lime relative overflow-hidden rounded-[22px] p-5 shadow-[0_12px_32px_-12px_rgba(20,16,24,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[rgba(20,16,24,0.62)]">
                  Fees this month
                </p>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[rgba(20,16,24,0.5)]">
                    Last month
                  </p>
                  <p className="text-[13px] font-extrabold text-[rgba(20,16,24,0.8)] [font-variant-numeric:tabular-nums]">
                    {formatKobo(a.feesLastMonthKobo)}
                  </p>
                </div>
              </div>
              <p className="mt-8 text-[42px] font-extrabold leading-none tracking-[-0.05em] text-white [font-variant-numeric:tabular-nums]">
                {formatKobo(a.feesThisMonthKobo)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,0.82)]">
                  {formatKobo(a.feesAllKobo)} all time
                </span>
                {/* No chip in a first trading month: there is no previous
                    month, and "+0%" would be a comparison nobody made. */}
                {feeDelta !== null && (
                  <span className="rounded-full bg-[rgba(255,255,255,0.22)] px-2.5 py-[3px] text-[11.5px] font-extrabold text-white">
                    {feeDelta >= 0 ? "+" : ""}
                    {Math.round(feeDelta)}% vs last month
                  </span>
                )}
              </div>
            </div>

            <div className="adm-grad-rose relative overflow-hidden rounded-[22px] p-5 shadow-[0_12px_32px_-12px_rgba(20,16,24,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[rgba(20,16,24,0.62)]">
                  Effective take
                </p>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[rgba(20,16,24,0.5)]">
                    Headline rate
                  </p>
                  <p className="text-[13px] font-extrabold text-[rgba(20,16,24,0.8)]">
                    {PLATFORM_FEE_RATE_LABEL}
                  </p>
                </div>
              </div>
              <p className="mt-8 text-[42px] font-extrabold leading-none tracking-[-0.05em] text-white [font-variant-numeric:tabular-nums]">
                {pct(a.takeAllPct)}
              </p>
              <p className="mt-3 text-[12.5px] font-semibold text-[rgba(255,255,255,0.82)]">
                {formatKobo(a.feesAllKobo)} earned on {formatKobo(a.grossAllKobo)} sold
              </p>
            </div>
          </div>

          {/* THE GAP BETWEEN THE TWO RATES IS THE PRODUCT WORKING AS
              DESIGNED, and it is worth naming rather than leaving somebody
              to wonder whether the fee engine is broken. */}
          {a.takeAllPct !== null && a.takeAllPct < 4.5 && (
            <p className="text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
              The effective take sits below the headline {PLATFORM_FEE_RATE_LABEL} because
              the cap and the free floor are doing their job — tickets under{" "}
              ₦2,000 are charged nothing, and expensive tickets stop at{" "}
              {PLATFORM_FEE_CAP_MAX_LABEL}. That gap is the pitch, not a leak.
            </p>
          )}

          <MonthBars months={a.months} />

          {/* ── The plain figures ─────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            {[
              { l: "Paid orders", n: a.paidOrders.toLocaleString("en-NG"), x: `${a.ticketsPaid.toLocaleString("en-NG")} tickets` },
              { l: "Average order", n: formatKobo(a.avgOrderKobo), x: "gross, per order" },
              { l: "Fee per ticket", n: formatKobo(a.avgFeePerTicketKobo), x: "average, paid tickets" },
              { l: "Free registrations", n: a.freeRegistrations.toLocaleString("en-NG"), x: `${a.ticketsFree.toLocaleString("en-NG")} tickets · not revenue` },
            ].map((f) => (
              <div key={f.l} className="adm-card min-w-[172px] flex-1 px-5 py-4">
                <p className={label}>{f.l}</p>
                <p className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums]">
                  {f.n}
                </p>
                <p className="mt-2 text-[12px] text-[var(--dl-ink-soft)]">{f.x}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Does it depend on one person ───────────────── */}
            <div className={`${panel} overflow-hidden`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--dl-line)] px-5 py-3.5">
                <p className={label}>Where the fees come from</p>
                <p className="text-[12px] text-[var(--dl-ink-faint)]">
                  {a.organisersWithRevenue}{" "}
                  {a.organisersWithRevenue === 1 ? "organiser" : "organisers"} with revenue
                </p>
              </div>

              {a.topOneSharePct !== null && a.topOneSharePct > 50 && (
                <p className="border-b border-[var(--dl-line)] bg-[#FDF1D8] px-5 py-3 text-[13px] font-semibold text-[#7A5000]">
                  One organiser is {pct(a.topOneSharePct, 0)} of all fee income. Losing
                  them would take most of the revenue with them.
                </p>
              )}

              <Scroll>
                <table className="w-full min-w-[380px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Organiser</th>
                      <th className={`${th} text-right`}>Fees</th>
                      <th className={`${th} text-right`}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.topOrganisers.map((o) => (
                      <tr key={`${o.name}-${o.handle ?? ""}`}>
                        <td className={td}>
                          <b>{o.name}</b>
                          {o.handle && (
                            <span className="ml-1.5 text-[12.5px] text-[var(--dl-ink-faint)]">
                              /{o.handle}
                            </span>
                          )}
                        </td>
                        <td className={tdNum}>{formatKobo(o.feesKobo)}</td>
                        <td className={tdNum}>{pct(o.sharePct, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>

              {a.topThreeSharePct !== null && (
                <p className="px-5 py-3.5 text-[12.5px] text-[var(--dl-ink-soft)]">
                  Top three together: <b>{pct(a.topThreeSharePct, 0)}</b> of all fees.
                </p>
              )}
            </div>

            {/* ── Do organisers come back ────────────────────── */}
            <div className={`${panel} overflow-hidden`}>
              <div className="border-b border-[var(--dl-line)] px-5 py-3.5">
                <p className={label}>Do organisers come back</p>
              </div>
              <div className="p-5">
                <p className="text-[42px] font-extrabold leading-none tracking-[-0.05em] [font-variant-numeric:tabular-nums]">
                  {pct(a.repeatRatePct, 0)}
                </p>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                  <b>{a.organisersPublishedTwice}</b> of{" "}
                  <b>{a.organisersPublished}</b>{" "}
                  {a.organisersPublished === 1 ? "organiser has" : "organisers have"}{" "}
                  published a second event.
                  {a.medianDaysToSecond !== null && (
                    <>
                      {" "}
                      The typical gap between a first and a second is{" "}
                      <b>{a.medianDaysToSecond} days</b>.
                    </>
                  )}
                </p>
                <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--dl-ink-faint)]">
                  Counted on published events only. A draft is an intention, and
                  counting intentions as repeat business turns a retention number
                  into a comforting one.
                </p>
              </div>
            </div>
          </div>

          {/* ── Is the pricing landing where it was designed ─── */}
          <div className={`${panel} overflow-hidden`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--dl-line)] px-5 py-3.5">
              <p className={label}>Where tickets actually sit</p>
              <p className="text-[12px] text-[var(--dl-ink-faint)]">
                {a.ticketsAtCappedPrice.toLocaleString("en-NG")} sold at a price where the
                cap sets the fee
              </p>
            </div>
            <Scroll>
              <table className="w-full min-w-[460px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Ticket price</th>
                    <th className={`${th} text-right`}>Sold</th>
                    <th className={`${th} text-right`}>Our fee on one</th>
                    <th className={th}>Set by</th>
                  </tr>
                </thead>
                <tbody>
                  {a.priceBands.map((b) => (
                    <tr key={b.label}>
                      <td className={td}><b>{b.label}</b></td>
                      <td className={tdNum}>{b.tickets.toLocaleString("en-NG")}</td>
                      <td className={tdNum}>
                        {b.feePerTicketKobo === 0 ? "Nothing" : formatKobo(b.feePerTicketKobo)}
                      </td>
                      <td className={td}>
                        <span className="text-[13px] text-[var(--dl-ink-soft)]">
                          {b.feePerTicketKobo === 0
                            ? "Free floor"
                            : b.capped
                              ? "The cap"
                              : `The ${PLATFORM_FEE_RATE_LABEL} rate`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
            <p className="px-5 py-3.5 text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
              &ldquo;Our fee on one&rdquo; is the fee on a ticket in the middle of each
              band, computed by the same function checkout uses — it cannot drift
              from what an organiser is actually charged.
            </p>
          </div>
        </>
      )}

      {/* ── What this cannot answer ───────────────────────────── */}
      <div className={`${panel} p-5`}>
        <p className={label}>Not on this page</p>
        <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          {a.funnel.why}
        </p>
      </div>
    </section>
  );
}
