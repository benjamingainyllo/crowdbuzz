import Link from "next/link";
import { listCheckIns } from "@/lib/admin-ops";
import {
  panel, PageHead, Figures, Empty, Scroll, th, td, Pager, SearchBar, niceDateTime,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Check-ins — owner",
  robots: { index: false, follow: false },
};

/**
 * Who was scanned in, where, and by whom.
 *
 * A VIEW OVER DATA THAT ALREADY EXISTED. Every ticket has recorded its
 * scan time and its scanner since the door screen was built; nothing was
 * reading them across the platform. The counters are asked for with
 * head:true so they count every ticket rather than the thirty on screen.
 *
 * "Turned up" is the number worth watching. It is not a vanity figure:
 * an event that sold well and scanned nobody either did not happen or is
 * not using the door screen, and both are worth a phone call.
 */
export default async function CheckInsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; event?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const data = await listCheckIns({ page, q: searchParams.q, eventId: searchParams.event });

  const rate = data.issued > 0 ? (data.scanned / data.issued) * 100 : null;

  return (
    <section>
      <PageHead
        title="Check-ins"
        sub="Every scan across every event, newest first."
      />

      <Figures
        items={[
          { l: "Tickets issued", n: data.issued.toLocaleString("en-NG"), x: "all time", tone: "count" },
          { l: "Turned up", n: data.scanned.toLocaleString("en-NG"), x: "scanned at a door", tone: "money" },
          {
            l: "Turnout",
            n: rate === null ? "—" : `${rate.toFixed(0)}%`,
            x: "scanned ÷ issued",
            tone: "group",
          },
          { l: "Last 24 hours", n: data.last24h.toLocaleString("en-NG"), x: "scans", tone: "fee" },
        ]}
      />

      <div className="mt-6">
        <SearchBar
          action="/admin/check-ins"
          q={searchParams.q}
          placeholder="Ticket code, holder name or email…"
        />

        <div className={`${panel} overflow-hidden`}>
          {data.rows.length === 0 ? (
            <Empty
              title={searchParams.q ? "Nothing matches that" : "Nobody has been scanned in yet"}
              body={
                searchParams.q
                  ? "Try the ticket code, or part of the holder's email."
                  : "Scans appear here the moment an organiser starts checking people in at a door. Until an event has run, this is empty — which is correct, not broken."
              }
            />
          ) : (
            <Scroll>
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Ticket</th>
                    <th className={th}>Holder</th>
                    <th className={th}>Event</th>
                    <th className={th}>Scanned</th>
                    <th className={th}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.code}>
                      <td className={td}>
                        <Link href={`/ticket/${r.code}` as never} className="font-bold hover:underline">
                          {r.code}
                        </Link>
                        {r.ticketTypeName && (
                          <p className="mt-0.5 text-[12.5px] text-[var(--dl-ink-faint)]">
                            {r.ticketTypeName}
                          </p>
                        )}
                      </td>
                      <td className={td}>
                        <p className="font-bold">{r.holderName ?? "—"}</p>
                        {r.holderEmail && (
                          <p className="mt-0.5 text-[12.5px] text-[var(--dl-ink-faint)]">
                            {r.holderEmail}
                          </p>
                        )}
                      </td>
                      <td className={td}>
                        <Link
                          href={`/admin/events/${r.eventId}` as never}
                          className="font-bold hover:underline"
                        >
                          {r.eventTitle}
                        </Link>
                      </td>
                      <td className={td}>{niceDateTime(r.checkedInAt)}</td>
                      <td className={td}>
                        <span className="text-[13px] text-[var(--dl-ink-soft)]">
                          {r.scannedByEmail ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          )}
        </div>

        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          base="/admin/check-ins"
          params={{ q: searchParams.q, event: searchParams.event }}
        />
      </div>
    </section>
  );
}
