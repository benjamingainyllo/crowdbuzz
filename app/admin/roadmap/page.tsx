import Link from "next/link";
import { PageHead, panel, label } from "@/components/admin/ui";
import { PLANNED_SCREENS, READY_TO_BUILD } from "@/lib/admin-roadmap";

export const metadata = {
  title: "Roadmap — owner",
  robots: { index: false, follow: false },
};

/**
 * What the console is still missing, in one place.
 *
 * THIS EXISTS SO THE MENU DOES NOT HAVE TO CARRY IT. Fourteen menu rows
 * wearing a "Soon" label made a console of fifteen working screens read
 * as a prototype, and a menu is a list of what you can do rather than a
 * list of what is planned. The plan is worth keeping — it is just worth
 * keeping on one page.
 *
 * THE SPLIT IS THE USEFUL PART. "Needs a screen" and "needs a feature"
 * look identical on a menu and are nothing alike in practice: one is an
 * afternoon against data that already exists, the other is a part of the
 * product nobody has built. Sorted that way, this page answers "what
 * should we do next" rather than just listing what is absent.
 */
export default function RoadmapPage() {
  const ready = PLANNED_SCREENS.filter((s) => READY_TO_BUILD.has(s.slug));
  const blocked = PLANNED_SCREENS.filter((s) => !READY_TO_BUILD.has(s.slug));

  const Card = ({ s }: { s: (typeof PLANNED_SCREENS)[number] }) => (
    <Link
      href={`/admin/${s.slug}` as never}
      className={`${panel} block p-4 transition-colors hover:bg-[#FAFBFB]`}
    >
      <p className="text-[15px] font-extrabold tracking-[-0.02em]">{s.title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">{s.sub}</p>
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--dl-ink-faint)]">
        {s.needs[0]}
      </p>
    </Link>
  );

  return (
    <section className="space-y-7">
      <PageHead
        title="Roadmap"
        sub={`${PLANNED_SCREENS.length} screens the console is being built to. Each one opens a page saying what it will hold.`}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className={label}>Ready to build</p>
          <p className="text-[12.5px] text-[var(--dl-ink-soft)]">
            The data already exists — these need the screen and nothing else.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ready.map((s) => (
            <Card key={s.slug} s={s} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className={label}>Needs a feature first</p>
          <p className="text-[12.5px] text-[var(--dl-ink-soft)]">
            These are waiting on a part of the product that does not exist yet.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {blocked.map((s) => (
            <Card key={s.slug} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
