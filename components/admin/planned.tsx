import { panel, PageHead } from "@/components/admin/ui";

/**
 * A screen that is in the menu but not yet built.
 *
 * WHY THESE EXIST AT ALL. The console's menu is laid out to the shape the
 * platform is going to be, not the shape it is today — that is what makes
 * it navigable while it fills in. But a menu item that goes nowhere is a
 * bug report waiting to happen, and a page that greets you with invented
 * charts is worse than either: somebody eventually makes a decision on a
 * number nobody computed.
 *
 * So an unbuilt screen says so, in the first line, and then says exactly
 * what it will hold and what has to exist first. That is useful — it is
 * the difference between "this is broken" and "this is next".
 *
 * NOTHING IN HERE READS THE DATABASE and nothing here should ever be
 * given a fake figure to display. When a screen becomes real, this file
 * stops being imported by it.
 */
export function Planned({
  title,
  sub,
  will,
  needs,
}: {
  title: string;
  sub: string;
  /** What the screen will show once it is built. */
  will: string[];
  /** What has to exist in the product first. Empty when the data is already there. */
  needs?: string[];
}) {
  return (
    <section>
      <PageHead title={title} sub={sub} />

      <div className={`${panel} p-5`}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dl-ink-faint)]">
          Not built yet
        </p>
        <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          This screen is in the menu so the console has the shape it is going
          to have. It is empty on purpose — showing made-up figures here
          would be worse than showing none.
        </p>

        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dl-ink-faint)]">
          What it will show
        </p>
        <ul className="mt-2 space-y-1.5">
          {will.map((w) => (
            <li key={w} className="flex gap-2.5 text-[14px] text-[var(--dl-ink)]">
              <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--dl-ink-faint)]" />
              <span className="max-w-[62ch]">{w}</span>
            </li>
          ))}
        </ul>

        {needs && needs.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--dl-ink-faint)]">
              What has to be built first
            </p>
            <ul className="mt-2 space-y-1.5">
              {needs.map((n) => (
                <li key={n} className="flex gap-2.5 text-[14px] text-[var(--dl-ink-soft)]">
                  <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--dl-ink-faint)]" />
                  <span className="max-w-[62ch]">{n}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
