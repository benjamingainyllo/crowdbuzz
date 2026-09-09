"use client";

import { useEffect, useState, useTransition } from "react";
import { getReactions, toggleReaction } from "@/app/actions/reactions";
import {
  REACTIONS,
  REACTION_LABELS,
  emptyCounts,
  totalReactions,
  type Reaction,
  type ReactionCounts,
} from "@/lib/reactions";

/**
 * The row of emoji under an event. One tap, no account, no email.
 *
 * WHY THIS EXISTS AT ALL. An event page used to be a notice board: here
 * is the night, here is the price, buy or leave. A group chat is not like
 * that — somebody drops a flyer and six people react before anybody says
 * they are coming. This is that, and it is the cheapest social proof on
 * the page because it costs the visitor a single tap.
 *
 * OPTIMISTIC, BECAUSE THE ALTERNATIVE FEELS BROKEN. The count moves the
 * instant you tap and is corrected by the server's answer a moment later.
 * A reaction that waits 400ms to appear reads as a page that didn't hear
 * you, and people tap it again.
 *
 * IT RENDERS BEFORE IT HAS LOADED. The bar is drawn from a zeroed set on
 * first paint and filled in on mount, so the layout never jumps and the
 * page has no empty hole where this will eventually be.
 */
export function ReactionBar({ eventId }: { eventId: string }) {
  const [counts, setCounts] = useState<ReactionCounts>(emptyCounts);
  const [mine, setMine] = useState<Reaction[]>([]);
  const [popped, setPopped] = useState<Reaction | null>(null);
  /* Each tap adds a short-lived flyer keyed by an id, so tapping fast
     stacks several in the air instead of restarting one animation. */
  const [flyers, setFlyers] = useState<
    { id: number; emoji: Reaction; tilt: number; drift: number }[]
  >([]);
  const [, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getReactions(eventId)
      .then((res) => {
        if (!alive) return;
        setCounts(res.counts);
        setMine(res.mine);
      })
      .catch(() => {
        // Leave it at zeroes. A page that cannot count reactions is still
        // a page that sells tickets.
      });
    return () => {
      alive = false;
    };
  }, [eventId]);

  const tap = (emoji: Reaction) => {
    const held = mine.includes(emoji);

    // Move first, reconcile after.
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] || 0) + (held ? -1 : 1)) }));
    setMine((m) => (held ? m.filter((e) => e !== emoji) : [...m, emoji]));
    setPopped(emoji);
    window.setTimeout(() => setPopped((p) => (p === emoji ? null : p)), 340);

    // Only when adding one. Taking a reaction back should not celebrate.
    if (!held) {
      const id = Date.now() + Math.random();
      setFlyers((f) => [
        ...f,
        {
          id,
          emoji,
          // Randomised so two taps never trace the same arc.
          tilt: Math.round(Math.random() * 36 - 18),
          drift: Math.round(Math.random() * 44 - 22),
        },
      ]);
      window.setTimeout(() => setFlyers((f) => f.filter((x) => x.id !== id)), 950);
    }

    start(async () => {
      const res = await toggleReaction(eventId, emoji);
      if (!res.ok) {
        // Put it back exactly as it was rather than guessing.
        setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] || 0) + (held ? 1 : -1)) }));
        setMine((m) => (held ? [...m, emoji] : m.filter((e) => e !== emoji)));
        return;
      }
      setCounts(res.counts);
      setMine((m) => (res.mine ? Array.from(new Set([...m, emoji])) : m.filter((e) => e !== emoji)));
    });
  };

  const total = totalReactions(counts);

  return (
    <div className="sf-reactions">
      <div className="flex flex-wrap items-center gap-2">
        {REACTIONS.map((emoji) => {
          const held = mine.includes(emoji);
          const n = counts[emoji] || 0;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => tap(emoji)}
              aria-pressed={held}
              aria-label={`${REACTION_LABELS[emoji]}${n ? ` — ${n} so far` : ""}`}
              title={REACTION_LABELS[emoji]}
              className={[
                "sf-reaction",
                held ? "sf-reaction-on" : "",
                popped === emoji ? "sf-reaction-pop" : "",
              ].join(" ")}
            >
              <span aria-hidden="true" className="text-[17px] leading-none">
                {emoji}
              </span>

              {flyers
                .filter((f) => f.emoji === emoji)
                .map((f) => (
                  <span
                    key={f.id}
                    aria-hidden="true"
                    className="sf-float"
                    style={
                      {
                        "--tilt": `${f.tilt}deg`,
                        "--drift": `${f.drift}px`,
                      } as React.CSSProperties
                    }
                  >
                    {emoji}
                  </span>
                ))}
              {n > 0 && (
                <span className="text-[12.5px] font-extrabold tabular-nums leading-none">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[12.5px] font-semibold text-[var(--dl-ink-faint)]">
        {total === 0
          ? "Be the first to say something."
          : total === 1
            ? "1 person reacted. No account needed."
            : `${total} people reacted. No account needed.`}
      </p>
    </div>
  );
}
