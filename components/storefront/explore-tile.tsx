import Link from "next/link";
import { formatKobo } from "@/lib/money";
import type { ExploreEvent } from "@/lib/explore";
import { InterestButton } from "@/components/storefront/interest-button";
import { whenLabel, tintFor } from "@/lib/event-display";

/**
 * One event in a rail: the flyer, then what it is.
 *
 * THE PICTURE IS THE CARD. On a discovery page nobody reads first — they
 * scan artwork and stop at the one that looks like their night. So the
 * flyer gets the whole top of the tile at a poster's proportions, the
 * save count rides on it as social proof, and the words underneath are
 * small and quiet. The earlier layout put an 84px thumbnail beside three
 * lines of text, which is a search result, not a flyer wall.
 *
 * NO CARD AROUND IT. A border and a panel behind every tile turns a rail
 * into a row of identical boxes and the artwork stops being the thing you
 * see. The flyer's own edge is the card; everything below it sits
 * directly on the page.
 */
export function ExploreTile({ event }: { event: ExploreEvent }) {
  const [a, b] = tintFor(event.id);
  const initial = (event.hostName || event.title || "C").trim().charAt(0).toUpperCase();

  return (
    <article className="group w-[228px] shrink-0 snap-start sm:w-[248px]">
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px]"
        style={{ background: `linear-gradient(150deg, ${a} 0%, ${b} 100%)` }}
      >
        <Link href={`/event/${event.id}`} className="absolute inset-0" aria-label={event.title}>
          {event.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            /* JUST THE INITIAL. The list card sets the title inside this
               square because there it is the only place it appears at
               poster size — but here the title is already the first line
               under the tile, so a caption band repeats it, and the save
               pill in the bottom-right lands on top of the repeat. */
            <span
              className="absolute inset-0 grid place-items-center text-[64px] font-black text-white/90"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.3)" }}
              aria-hidden="true"
            >
              {initial}
            </span>
          )}
        </Link>

        {event.fromKobo !== null && (
          <span
            className={`pointer-events-none absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] shadow-[0_3px_12px_rgba(0,0,0,0.35)] ${
              event.fromKobo === 0
                ? "bg-[var(--mint)] text-[#0B2B1D]"
                : "bg-black/70 text-white backdrop-blur-[2px]"
            }`}
          >
            {event.fromKobo === 0 ? "Free" : formatKobo(event.fromKobo)}
          </span>
        )}

        {/* Outside the link on purpose: tapping the count saves, it does
            not open the event. */}
        <div className="absolute bottom-2.5 right-2.5">
          <InterestButton
            eventId={event.id}
            initialSaved={event.saved}
            initialCount={event.interested}
            variant="pill"
          />
        </div>
      </div>

      <Link href={`/event/${event.id}`} className="mt-3 block">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-[1.25] tracking-[-0.015em] text-[var(--on-ground)]">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-[12.5px] font-semibold text-[var(--on-ground-soft)]">
          {whenLabel(event.date, event.time)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.45] text-[var(--on-ground-faint)]">
            {event.description}
          </p>
        )}
      </Link>

      {/* Who is putting it on, last and small. On the rail the artwork is
          doing the selling; the host is the confirmation, not the hook. */}
      <p className="mt-2 flex items-center gap-1.5">
        <span
          className="grid h-[16px] w-[16px] shrink-0 place-items-center rounded-full text-[8.5px] font-black text-white"
          style={{ background: a }}
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="truncate text-[11.5px] font-bold text-[var(--on-ground-faint)]">
          {event.hostName}
        </span>
      </p>
    </article>
  );
}
