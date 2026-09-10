import Link from "next/link";
import { TrendChip } from "@/components/charts/figures";
import type { Trend } from "@/lib/dashboard-shape";
// The badge tones below are named states (ok/warn/bad); these are the
// figure tones (money/count/fee/risk/group). Different jobs, so the
// import is renamed rather than merged.
import { TONE_INK, TONE_WASH, type Tone as FigureTone } from "@/lib/tones";

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
export const panel = "adm-card";
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-[30px] font-extrabold leading-none tracking-[-0.04em]">{title}</h1>
        {sub && (
          <p className="mt-2 text-[13.5px] text-[var(--dl-ink-soft)]">{sub}</p>
        )}
      </div>
      {right}
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
  items: { n: string; l: string; x?: string; t?: Trend; invert?: boolean; tone?: FigureTone }[];
}) {
  /*
   * Separate tiles, not one ruled grid.
   *
   * The old strip was a single bordered block cut into cells by 2px
   * rules, with a negative-margin trick so the outer rules tucked under
   * the panel border. None of that survives a design with no rules in
   * it: the tiles are their own cards now and the gap between them does
   * what the rule used to.
   *
   * The numerals grow to 34px because on this screen they are the
   * content. A tone still tints the tile, but at a fraction of its old
   * strength — a saturated wash behind a large number fights it.
   */
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((f) => (
        <div
          key={f.l}
          className="adm-card min-w-[172px] flex-1 px-5 py-4"
          style={f.tone ? { background: TONE_WASH[f.tone] } : undefined}
        >
          <p
            className="text-[10.5px] font-extrabold uppercase tracking-[0.16em]"
            style={{ color: f.tone ? TONE_INK[f.tone] : "var(--dl-ink-faint)" }}
          >
            {f.l}
          </p>
          <p className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums]">
            {f.n}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {f.t && <TrendChip trend={f.t} invert={f.invert} />}
            {f.x && <span className="text-[12px] text-[var(--dl-ink-soft)]">{f.x}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "flat";

const TONES: Record<Tone, string> = {
  ok: "bg-[#E8F7EE] text-[#146B45]",
  warn: "bg-[#FDF1D8] text-[#7A5000]",
  bad: "bg-[#FFEBEF] text-[#B32243]",
  flat: "bg-[rgba(20,16,24,0.05)] text-[var(--dl-ink-soft)]",
};

export function Badge({ tone = "flat", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.08em] ${TONES[tone]}`}
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
    <div
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--dl-line)] px-5 py-3.5"
      style={{ background: TONE_WASH[tone] }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className="text-[10.5px] font-extrabold uppercase tracking-[0.18em]"
          style={{ color: TONE_INK[tone] }}
        >
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
  "border-b border-[var(--dl-line)] px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)] whitespace-nowrap";
export const td = "border-b border-[var(--dl-line-soft)] px-5 py-3.5 text-[14px] align-top";
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

  const btn = "adm-pill px-4 uppercase tracking-[0.04em] text-[12px]";

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
        className="h-[42px] min-w-[220px] flex-1 rounded-full border border-[rgba(20,16,24,0.08)] bg-[var(--dl-panel)] px-4 text-[14px] outline-none transition-shadow placeholder:text-[var(--dl-ink-faint)] focus:shadow-[0_0_0_3px_rgba(20,16,24,0.06)]"
      />
      {extra}
      <button
        type="submit"
        className="h-[42px] rounded-full bg-[var(--dl-ink)] px-5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-[1px]"
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
      className="h-[42px] rounded-full border border-[rgba(20,16,24,0.08)] bg-[var(--dl-panel)] px-4 text-[14px] font-semibold outline-none"
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
