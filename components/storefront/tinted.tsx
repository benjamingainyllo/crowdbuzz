"use client";

import { useEffect, useState } from "react";
import { coloursFromImage, type ColourPair } from "@/lib/image-colour";

/**
 * Wraps something in the colours of its own picture.
 *
 * A THIN CLIENT SHELL SO THE CARD STAYS A SERVER COMPONENT. Reading
 * pixels needs a canvas and therefore a browser, but that is the only
 * part of an explore card that does — everything else renders fine on the
 * server. So this holds the effect and the CSS variables, and the card's
 * markup passes straight through as children.
 *
 * Starts on the fallback pair and swaps when the real colours arrive, so
 * a card is never blank and never flashes: the worst case is that it
 * keeps the hashed colour it would have had anyway.
 */
export function Tinted({
  src,
  fallback,
  className,
  children,
}: {
  src?: string | null;
  fallback: ColourPair;
  className?: string;
  children: React.ReactNode;
}) {
  const [pair, setPair] = useState<ColourPair>(fallback);

  useEffect(() => {
    if (!src) {
      setPair(fallback);
      return;
    }
    let alive = true;
    coloursFromImage(src).then((p) => {
      if (alive && p) setPair(p);
    });
    return () => {
      alive = false;
    };
    // fallback is derived from the event id, so it is stable per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      className={className}
      style={
        { "--ev-from": pair.from, "--ev-to": pair.to } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
