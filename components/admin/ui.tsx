import Link from "next/link";
import { Sparkline, TrendChip } from "@/components/charts/figures";
import type { Trend } from "@/lib/dashboard-shape";
// The badge tones below are named states (ok/warn/bad); these are the
// figure tones (money/count/fee/risk/group). Different jobs, so the
// import is renamed rather than merged.
import { TONE_HEX, TONE_INK, TONE_WASH, type Tone as FigureTone } from "@/lib/tones";

/**
 * The furniture every admin list is built from.
 *
 * Extracted so that "what an empty table looks like" and "what a status
 * badge looks like" are decided once. Seven screens each inventing their
 * own is how an internal tool starts to feel like seven tools.
 */

/*
 * A card, not a ruled box.
 *
 * This was a 3px-cornered box with a 2px full-ink border, which is the
 * old Daylight character: structure carried by the edge. The console now
 * carries structure with shadow and space instead, so the border drops to
 * a hairline that only stops a white card dissolving into a near-white
 * page, and the lift does the rest. See the .adm block in globals.css.
 */
export const panel = "dl-card";
export const label =
  "text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[var(--dl-ink-faint)]";

/**
 * A screen's label in a console, not a headline on a page.
 *
 * These were 38px display type, which is right for a page somebody reads
 * and wrong for the twentieth screen of a tool somebody works in: it
 * pushed the table — the reason the screen exists — down past the fold,
 * and made every internal list read like an article about itself.
 */
export function PageHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold leading-none tracking-[-0.035em]">{title}</h1>
        {sub && (
          <p className="mt-1.5 text-[13.5px] text-[var(--dl-ink-soft)]">{sub}</p>
        )}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/**
 * Numbers in a single ruled block.
 *
 * DELIBERATELY NOT THE SPARKLINE TILES the organiser's dashboard uses. An
 * organiser opens their dashboard to see how they are doing, and a shape
 * answers that. An owner opens the console to run the platform, and a row
 * of chart cards above the work pushes the work below the fold — which is
 * how an operations tool starts reading as a report about itself. The
 * delta stays, because a fee total with no direction still says nothing;
 * the picture goes.
 */
export function Figures({
  items,
}: {
  items: {
    n: string;
    l: string;
    x?: string;
    t?: Trend;
    invert?: boolean;
    tone?: FigureTone;
    /** The shape behind the number. Drawn only when there is one. */
    spark?: number[];
    icon?: React.ReactNode;
  }[];
}) {
  /*
   * ONE CARD PER FIGURE, EACH CARRYING ITS OWN SHAPE.
   *
   * These were cells in a single ruled block, which is compact and says
   * nothing: a fee total with no direction is a number you cannot act on,
   * and the delta chip alone only says "up" — not whether it climbed
   * steadily or spiked once and fell back. A sparkline answers that in
   * the space the old rule occupied.
   *
   * A GRID, NOT A FLEX ROW. flex-1 with a min-width shares the leftover
   * space between whatever fits on a line, so four cards on one row and
   * one on the next made the fifth card three times the width of the
   * others — the same number, three times louder, by accident.
   */
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((f) => (
        <div key={f.l} className="dl-card p-4">
          <div className="flex items-center gap-2">
            {f.icon && (
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px]"
                style={{ background: f.tone ? TONE_WASH[f.tone] : "#F1F2F4" }}
              >
                {f.icon}
              </span>
            )}
            <p
              className="truncate text-[12.5px] font-bold"
              style={{ color: f.tone ? TONE_INK[f.tone] : "var(--dl-ink-soft)" }}
            >
              {f.l}
            </p>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[26px] font-extrabold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums]">
                {f.n}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {f.t && <TrendChip trend={f.t} invert={f.invert} />}
                {f.x && (
                  <span className="text-[11.5px] text-[var(--dl-ink-faint)]">{f.x}</span>
                )}
              </div>
            </div>

            {f.spark && f.spark.length > 1 && (
              /* TONE_HEX, NOT TONE_INK. TONE_INK is a CSS variable, and a
                 variable cannot go inside an SVG gradient id — the id came
                 out as "spark-var(--dl-money)-30-…", url(#…) could not
                 resolve it, and SVG falls back to solid black for an
                 unresolvable paint. The sparklines rendered as black
                 blobs. lib/tones.ts says exactly this at the top of
                 TONE_HEX; I used the wrong one. */
              <Sparkline
                data={f.spark}
                colour={f.tone ? TONE_HEX[f.tone] : undefined}
                className="shrink-0 opacity-90"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "flat";

const TONES: Record<Tone, string> = {
  ok: "border-[#B7E4CB] bg-[#EDF9F2] text-[#146B45]",
  warn: "border-[#F3DCA6] bg-[#FDF6E7] text-[#7A5000]",
  bad: "border-[#F5C2CE] bg-[#FDEEF1] text-[#B32243]",
  flat: "border-[var(--dl-line)] bg-[#F6F7F8] text-[var(--dl-ink-soft)]",
};

export function Badge({ tone = "flat", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-[2px] text-[11px] font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** State names are decided in one place so two screens can't disagree. */
export function stateTone(state: string): Tone {
  switch (state) {
    case "ok":
    case "paid":
    case "published":
    case "active":
    case "success":
    case "valid":
      return "ok";
    case "flagged":
    case "pending":
    case "restricted":
    case "processing":
      return "warn";
    case "suspended":
    case "cancelled":
    case "failed":
    case "refunded":
    case "void":
      return "bad";
    default:
      return "flat";
  }
}

/** A tinted band for an admin panel, matching the product's. */
export function Band({
  title,
  note,
  right,
  tone = "neutral",
}: {
  title: string;
  note?: string;
  right?: React.ReactNode;
  tone?: FigureTone;
}) {
  return (
    /* A NEUTRAL GROUND, WITH THE TONE ONLY IN THE LABEL. A full-strength
       wash behind a panel header was right on a design carried by colour;
       on a bordered white card it reads as a highlighted row and pulls
       the eye away from the table it is introducing. The tone still says
       what kind of thing this is — it just says it in the text. */
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--dl-line)] bg-[#FAFBFB] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[12.5px] font-extrabold" style={{ color: TONE_INK[tone] }}>
          {title}
        </p>
        {note && <p className="text-[12px] text-[var(--dl-ink-soft)]">{note}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-[16px] font-extrabold tracking-[-0.02em]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
        {body}
      </p>
    </div>
  );
}

/** Wide tables scroll inside themselves; the page never moves sideways. */
export function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const th =
  "bg-[#FAFBFB] border-b border-[var(--dl-line)] px-4 py-2.5 text-left text-[11.5px] font-bold text-[var(--dl-ink-faint)] whitespace-nowrap";
export const td = "border-b border-[var(--dl-line-soft)] px-4 py-3 text-[13.5px] align-top";
export const tdNum = `${td} text-right [font-variant-numeric:tabular-nums] whitespace-nowrap`;

export function Pager({
  page,
  total,
  pageSize,
  base,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  base: string;
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${base}?${q.toString()}`;
  };

  const btn = "dl-btn";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-[13px] text-[var(--dl-ink-soft)]">
        Page {page} of {pages} · {total.toLocaleString("en-NG")} total
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1) as never} className={btn}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1) as never} className={btn}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

/** A plain GET form. No JavaScript needed to search an admin table. */
export function SearchBar({
  action,
  q,
  placeholder,
  extra,
}: {
  action: string;
  q?: string;
  placeholder: string;
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="dl-field min-w-[220px] flex-1"
      />
      {extra}
      <button
        type="submit"
        className="dl-btn dl-btn-primary"
      >
        Search
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
}: {
  name: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? "all"}
      className="dl-field font-semibold"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function niceDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function niceDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
