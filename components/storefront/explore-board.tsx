import Link from "next/link";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Squiggle } from "@/components/marketing/doodles";
import { ExploreTile } from "@/components/storefront/explore-tile";
import { EventRail } from "@/components/storefront/event-rail";
import { DiscoveryPopup } from "@/components/storefront/discovery-popup";
import { daysAway, tintFor } from "@/lib/event-display";
import type { CityBlock, ExploreEvent } from "@/lib/explore";

/**
 * Explore, as a wall of flyers.
 *
 * THE OLD SHAPE WAS A DIRECTORY AND THAT WAS THE PROBLEM. Cities as
 * columns of list rows, each row a small thumbnail beside three lines of
 * text, is how you lay out search results. A discovery page is not search
 * results: nobody arrives knowing what they want, so the artwork has to
 * do the work and the page has to feel like a place with things going on
 * rather than a table of contents.
 *
 * So it is rails now — one row per idea, scrolled sideways, with the
 * flyer taking the whole top of every tile. A rail reads the same whether
 * it holds three events or thirty, which matters enormously on a young
 * marketplace: the grid it replaced put one card in a three-column row
 * and left two thirds of the screen black.
 *
 * EVERY RAIL IS EARNED FROM REAL DATA. "This week" is events inside seven
 * days; "free" is events whose cheapest tier is zero; the rest are
 * cities. There is no editorial rail, no "trending", no "picks" — those
 * would be a claim about popularity we cannot yet support, and inventing
 * one is the fastest way to lose the first organiser who counts the room.
 * A rail with nothing in it does not render at all.
 *
 * CITIES GET A BANNER, not a heading, because a lowercase name in a
 * marker box over the city's own artwork is the difference between a
 * section and a place. The image is the best-supported flyer in that
 * city — real, never stock.
 */

function bannerArt(events: ExploreEvent[]): string | null {
  return events.find((e) => e.cover)?.cover ?? null;
}

/**
 * The city's name, set in a marker box over its own artwork.
 *
 * The tilt is 1.4°, which is deliberately barely there: enough that the
 * box reads as laid on top of the picture rather than composed into it,
 * not so much that it looks like a mistake in the CSS.
 */
function CityBanner({ block }: { block: CityBlock }) {
  const art = bannerArt(block.events);
  const [a, b] = tintFor(block.city.key);

  return (
    <div
      id={block.city.key}
      className="relative mx-5 mb-5 h-[132px] scroll-mt-24 overflow-hidden rounded-[20px] sm:mx-10 sm:h-[176px] lg:mx-16"
      style={{ background: `linear-gradient(120deg, ${a} 0%, ${b} 100%)` }}
    >
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      {/* Dark enough that a white marker box and its ink text hold up over
          a pale flyer, light enough that you can still see the picture. */}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="-rotate-[1.4deg] bg-[var(--paper)] px-4 py-1 text-[30px] font-extrabold lowercase leading-[1.15] tracking-[-0.045em] text-[var(--ink)] sm:px-6 sm:text-[46px]">
          {block.city.name}
        </span>
      </div>
      <span className="absolute bottom-3 right-4 text-[12px] font-bold text-white/85">
        {block.events.length} {block.events.length === 1 ? "event" : "events"}
      </span>
    </div>
  );
}

export function ExploreBoard({ blocks, total }: { blocks: CityBlock[]; total: number }) {
  const all = blocks.flatMap((b) => b.events);

  // Soonest first. The rails below slice from this, so "this week" comes
  // out in the order somebody would actually go to them.
  const soonest = [...all].sort((x, y) => {
    if (!x.date) return 1;
    if (!y.date) return -1;
    return x.date.localeCompare(y.date);
  });

  const thisWeek = soonest.filter((e) => {
    const d = daysAway(e.date);
    return d !== null && d >= 0 && d <= 7;
  });
  const free = soonest.filter((e) => e.fromKobo === 0);

  // The hero's backdrop is a strip of real flyers. With none, the gradient
  // underneath carries it alone rather than a stock photo standing in for
  // a marketplace that does not have one yet.
  const heroArt = all.filter((e) => e.cover).slice(0, 6);

  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      {/* INSIDE .lp, AND THAT IS THE WHOLE POINT. Rendered as a sibling of
          this <main> it falls outside the scope, and every custom property
          it is painted with — --coral, --paper, --ink — resolves to
          nothing. CSS drops those declarations silently, so it does not
          break, it just comes out grey. It is fixed-position, so nesting
          costs nothing: a fixed box takes the viewport as its containing
          block and is not clipped by this element's overflow. */}
      <DiscoveryPopup />

      <SiteNav />

      {/* ══════════════ Hero ══════════════ */}
      <section className="relative overflow-hidden border-b border-[var(--hairline)]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #FF6A45 0%, #7A1F3D 42%, #241430 100%)",
          }}
        />
        {heroArt.length > 0 && (
          <div aria-hidden="true" className="absolute inset-0 flex opacity-[0.42]">
            {heroArt.map((e) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={e.id}
                src={e.cover as string}
                alt=""
                loading="lazy"
                className="h-full min-w-0 flex-1 object-cover"
              />
            ))}
          </div>
        )}
        {/* Bottom-heavy so the words at the foot of the banner sit on
            something solid while the top of the picture stays visible. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(18,8,15,0.25) 0%, rgba(18,8,15,0.55) 46%, rgba(18,8,15,0.95) 100%)",
          }}
        />

        <div className="relative px-5 pb-10 pt-24 sm:px-10 sm:pb-14 sm:pt-36 lg:px-16">
          <h1 className="text-[54px] font-extrabold lowercase leading-[0.9] tracking-[-0.05em] sm:text-[92px]">
            explore
          </h1>
          <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-[var(--on-ground-soft)] sm:text-[18px]">
            {total > 0
              ? `${total.toLocaleString("en-NG")} ${total === 1 ? "night" : "nights"} on sale right now, and the people putting them on. No app, no account needed to buy.`
              : "Find the best nights and the communities behind them. Nothing is on sale yet, so this page is empty and honest about it."}
          </p>

          {blocks.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {blocks.slice(0, 8).map((b) => (
                <a
                  key={b.city.key}
                  href={`#${b.city.key}`}
                  className="flex h-9 items-center rounded-full border border-white/30 bg-black/25 px-4 text-[13px] font-bold text-white backdrop-blur-[2px] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                >
                  {b.city.name}
                  <span className="ml-2 opacity-60">{b.events.length}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ Nothing yet ══════════════ */}
      {blocks.length === 0 && (
        <section className="px-5 py-20 sm:px-10 lg:px-16">
          <Squiggle className="h-6 w-24 text-[var(--coral)]/50" />
          <h2 className="mt-5 text-[26px] font-extrabold tracking-[-0.03em]">
            Nothing on sale yet
          </h2>
          <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
            The moment an organiser publishes a paid or free event, it appears
            here with its date, its city and who is putting it on. Be the
            first — it takes about four minutes and costs nothing to list.
          </p>
          <div className="mt-8 flex">
            <StartCta />
          </div>
        </section>
      )}

      {/* ══════════════ The rails ══════════════ */}
      <div className="flex flex-col gap-12 py-12 sm:gap-16 sm:py-16">
        {thisWeek.length > 0 && (
          <EventRail
            title="this week"
            note={`${thisWeek.length} ${thisWeek.length === 1 ? "night" : "nights"} in the next seven days`}
          >
            {thisWeek.map((e) => (
              <ExploreTile key={e.id} event={e} />
            ))}
          </EventRail>
        )}

        {free.length > 0 && (
          <EventRail title="free to get in" note="No ticket price, no booking fee">
            {free.map((e) => (
              <ExploreTile key={e.id} event={e} />
            ))}
          </EventRail>
        )}

        {blocks.map((block) => (
          <div key={block.city.key} className="min-w-0">
            <CityBanner block={block} />
            <EventRail title={`what's on in ${block.city.name.toLowerCase()}`}>
              {block.events.map((e) => (
                <ExploreTile key={e.id} event={e} />
              ))}
            </EventRail>
          </div>
        ))}
      </div>

      {/* ══════════════ For organisers ══════════════ */}
      {blocks.length > 0 && (
        <section className="border-t border-[var(--hairline)] px-5 py-14 sm:px-10 sm:py-16 lg:px-16">
          <div className="flex flex-col items-start gap-5">
            <h2 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
              Putting something on?{" "}
              <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
                list it here.
              </span>
            </h2>
            <p className="max-w-xl text-[15.5px] leading-relaxed text-[var(--on-ground-soft)]">
              Publishing puts your event on this page and gives you one link to
              share. Money from every ticket lands in your own bank account as
              it sells — CrowdBuzz never holds it.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <StartCta />
              <Link
                href="/pricing"
                className="flex h-10 items-center text-[13px] font-semibold text-[var(--on-ground-soft)] underline underline-offset-4 hover:text-[var(--on-ground)]"
              >
                What it costs
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
