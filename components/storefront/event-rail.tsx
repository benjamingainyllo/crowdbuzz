"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A row of events you scroll sideways.
 *
 * WHY SIDEWAYS AND NOT A GRID. A grid of every event in a city is a
 * catalogue: it asks somebody to survey forty things before choosing one,
 * and it makes a page with three events look broken because two thirds of
 * the row is empty. A rail says "here are some, there are more" and reads
 * the same whether it holds three or thirty. Every discovery product
 * worth copying does this and it is not a stylistic choice.
 *
 * THE ARROWS ARE FOR DESKTOP AND ONLY APPEAR WHEN THEY DO SOMETHING. A
 * mouse has no thumb to swipe with, so a desktop rail without arrows is a
 * rail most people never scroll. But arrows on a row that already fits
 * are a lie about there being more, so they are hidden until the content
 * overflows, and each one dims at its end of the track.
 *
 * The row itself is a native scroller with snap points, so a phone gets
 * momentum and a trackpad gets two-finger scroll for free — neither
 * needs JavaScript, and the arrows are the only part that does.
 */
export function EventRail({
  title,
  note,
  children,
}: {
  title: React.ReactNode;
  /** A quiet line under the title — a count, or where these came from. */
  note?: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    // 2px of slack: sub-pixel widths mean scrollLeft never lands exactly
    // on the maximum, so an exact comparison leaves the right arrow lit
    // forever at the end of the track.
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    // Just under a screenful, so the card at the edge stays visible and
    // gives you your place — a full-width jump loses it.
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.82), behavior: "smooth" });
  };

  const hasOverflow = !(atStart && atEnd);

  return (
    <section className="min-w-0">
      <div className="flex items-end justify-between gap-4 px-5 sm:px-10 lg:px-16">
        <div className="min-w-0">
          <h2 className="text-[26px] font-extrabold lowercase leading-none tracking-[-0.04em] sm:text-[32px]">
            {title}
          </h2>
          {note && (
            <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">{note}</p>
          )}
        </div>

        {hasOverflow && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            {([-1, 1] as const).map((dir) => {
              const spent = dir === -1 ? atStart : atEnd;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => nudge(dir)}
                  disabled={spent}
                  aria-label={dir === -1 ? "Scroll left" : "Scroll right"}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[var(--hairline-firm)] text-[var(--on-ground-soft)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)] disabled:pointer-events-none disabled:opacity-30"
                >
                  {dir === -1 ? (
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* The padding is on the track, not on a wrapper, so the first card
          lines up with the heading while the last one can still scroll
          clear of the right edge instead of being cut off by it.

          SCROLL-PADDING HAS TO MATCH THAT PADDING OR THE GUTTER IS A LIE.
          A snap point is measured against the scrollport's scroll-padding,
          not against the element's own padding — so with scroll-padding at
          its default of zero the browser settles the first tile flush
          against the left edge, silently scrolling the gutter away and
          clipping the card's title. The three scroll-pl values below are
          the same three as the px values above and must stay that way. */}
      <div
        ref={track}
        onScroll={measure}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 scroll-pl-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-10 sm:scroll-pl-10 lg:px-16 lg:scroll-pl-16 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
