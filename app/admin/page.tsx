import Link from "next/link";
import { getPlatformStats } from "@/lib/platform-stats";
import { getOverviewShape } from "@/lib/admin-queries";
import { runDetectors } from "@/lib/attention";
import { formatKobo } from "@/lib/money";
import { TicketTypeSplit, WeekdayBars } from "@/components/charts/bars";
import {
  panel, label, Figures, Band, Badge, stateTone, niceDate, th, td, tdNum, Scroll,
} from "@/components/admin/ui";

// Money that changes by the minute should never be served from a cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "CrowdBuzz — owner",
  robots: { index: false, follow: false },
};

/**
 * The console you run the platform from.
 *
 * WHAT IS WRONG COMES FIRST. This screen used to open with a 42px
 * editorial headline, four chart cards and two graphs, and put the broken
 * payments below all of it. That is the shape of a monthly report, not of
 * an operations tool — and an owner does not open this to admire a
 * sparkline, they open it to find out what needs doing before a customer
 * finds out for them. So the queue is the first thing, the numbers are a
 * dense strip under it, the tables are the body, and the two charts sit
 * at the bottom where a background question belongs.
 *
 * EVERY ROW GOES SOMEWHERE. An alert that names a stuck payment and then
 * makes you go and search for it is half a tool. Each item links to the
 * order, event or organiser it is about.
 */

export default async function AdminPage() {
  await runDetectors();

  const [s, shape] = await Promise.all([getPlatformStats(), getOverviewShape()]);

  const takeRate =
    s.grossKobo > 0 ? `${((s.feesKobo / s.grossKobo) * 100).toFixed(1)}%` : "—";

  return (
    <section className="space-y-7">
      {/* A console labels the screen. It does not open with a headline. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-[22px] font-extrabold tracking-[-0.03em]">Overview</h1>
        <p className="text-[13px] text-[var(--dl-ink-soft)]">
          {new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}{" "}
          · {s.organisers} {s.organisers === 1 ? "organiser" : "organisers"} ·{" "}
          {s.eventsPublishedPaid} selling · {s.eventsPublishedFree} free ·{" "}
          {s.eventsDraft} draft
        </p>
      </div>

      {/* THE QUEUE IS NOT ON THIS SCREEN, AND THAT IS THE POINT.
          Four "payment still pending" rows, each carrying a raw UUID,
          filled the top of the overview and pushed the numbers below the
          fold — so the screen you open to see how the platform is doing
          opened instead with a wall of identical warnings. The queue
          still matters; it just does not need to be read in full every
          time somebody glances at the dashboard.

          What replaced it is a red count on Fraud & Risk in the sidebar,
          which is visible from every screen rather than only this one,
          and is the normal place to look for "is anything wrong".
          runDetectors() above still runs here, because the overview is
          the landing page and that keeps the count fresh. */}

      {/* ── The numbers ───────────────────────────────────────
          ONE ROW OF CARDS, EACH CARRYING ITS OWN SHAPE. These were two
          gradient panels and a strip, which put the design in the
          decoration; the console wants the design in the data. Each card
          now shows its figure, its direction and the shape of the last
          thirty days, which is the difference between "fees are up" and
          "fees are up because of one Saturday". */}
      <div className="mb-3">
        <p className={label}>Last 30 days</p>
      </div>
      <Figures
        items={[
          {
            l: "Your fees",
            n: formatKobo(shape.feesTrend.value),
            t: shape.feesTrend,
            x: `${formatKobo(s.feesKobo)} all time`,
            tone: "fee",
            spark: shape.dailyFees,
          },
          {
            l: "Moved through",
            n: formatKobo(shape.grossTrend.value),
            t: shape.grossTrend,
            x: "all organisers",
            tone: "money",
            spark: shape.dailyGross,
          },
          {
            l: "Tickets sold",
            n: shape.ticketsTrend.value.toLocaleString("en-NG"),
            t: shape.ticketsTrend,
            x: `${shape.ordersTrend.value} orders`,
            tone: "count",
            spark: shape.dailyTickets,
          },
          {
            l: "Effective take",
            n: takeRate,
            x: "fees \u00F7 gross, all time",
            tone: "fee",
          },
        ]}
      />

      {/* ── The body: two tables, side by side. ─────────────── */}
      {/* min-w-0 on every child: a grid item will not shrink below its own
          content by default, so the min-w-[480px] table below pushed the
          whole column past the right edge of a phone instead of scrolling
          inside its own box. */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <p className={label}>Newest events</p>
            <Link href="/admin/events" className="text-[12.5px] font-bold underline underline-offset-2">
              All events
            </Link>
          </div>
          <div className={panel}>
            {shape.recentEvents.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-[var(--dl-ink-soft)]">
                Nobody has created an event yet.
              </p>
            ) : (
              shape.recentEvents.slice(0, 6).map((e, i) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}` as never}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.03] ${
                    i !== 0 ? "border-t-2 border-[var(--dl-line)]" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-extrabold tracking-[-0.01em]">
                      {e.title}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--dl-ink-soft)]">
                      {e.organiserName} · {niceDate(e.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                      {formatKobo(e.grossKobo)}
                    </span>
                    <span className="block text-[12px] text-[var(--dl-ink-soft)]">
                      {e.ticketsSold} sold
                    </span>
                  </span>
                  <Badge tone={stateTone(e.publishStatus)}>
                    {e.publishStatus === "published" ? "Live" : "Draft"}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2.5 flex items-baseline justify-between gap-4">
            <p className={label}>Who is carrying it</p>
            <Link href="/admin/organisers" className="text-[12.5px] font-bold underline underline-offset-2">
              All organisers
            </Link>
          </div>
          <div className={panel}>
            {s.topOrganisers.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-[var(--dl-ink-soft)]">
                Nobody has sold a ticket yet.
              </p>
            ) : (
              <Scroll>
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Organiser</th>
                      <th className={`${th} text-right`}>Their sales</th>
                      <th className={`${th} text-right`}>Your fees</th>
                      <th className={`${th} text-right`}>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.topOrganisers.map((o: any) => (
                      <tr key={o.name} className="hover:bg-black/[0.02]">
                        <td className={`${td} font-extrabold`}>{o.name}</td>
                        <td className={tdNum}>{formatKobo(o.grossKobo)}</td>
                        <td className={tdNum}>{formatKobo(o.feesKobo)}</td>
                        <td className={tdNum}>{o.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </div>
        </div>
      </div>

      {/* ── Background questions, at the bottom. ────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={`${panel} min-w-0`}>
          <Band title="When people buy" note="last 30 days" tone="count" />
          <WeekdayBars data={shape.byWeekday} />
        </div>

        <div className={`${panel} min-w-0`}>
          <Band
            title="What they buy"
            tone="money"
            right={
              <Link href="/admin/tickets" className="text-[12px] font-bold underline underline-offset-2">
                All tickets
              </Link>
            }
          />
          <TicketTypeSplit data={shape.byTicketType} />
        </div>
      </div>
    </section>
  );
}
