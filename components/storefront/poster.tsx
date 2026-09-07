/**
 * Cover art for an event that has none.
 *
 * MOST EVENTS ARRIVE WITHOUT A FLYER. An organiser creating an event on a
 * phone at midnight is not also going to design one, and until now the page
 * answered that with an empty 4:5 box and a grey calendar icon — the single
 * ugliest thing on the storefront, and the thing a guest sees first.
 *
 * So a coverless event gets art anyway: a two-tone wash, a big soft ring
 * behind, and the title set across it. Everything is derived from the event
 * id, so the same event is always the same colours — an organiser who checks
 * their link twice does not see it change, and two events in a row on the
 * Explore page do not come out identical.
 *
 * The palette is Doorlane's own — the marketing site's accents, not stock
 * gradient purple — so a generated poster still reads as this product.
 */

/** Stable, well-spread hash. Same id in, same art out, forever. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Pairs, not random hues: a generated colour scheme picked per channel goes
 * muddy roughly a third of the time. These are hand-chosen out of the brand
 * palette and every one of them has been looked at.
 */
const SCHEMES: { from: string; to: string; ink: string }[] = [
  { from: "#FF6A45", to: "#FFB3C7", ink: "#2A0E05" }, // coral into marker pink
  { from: "#241430", to: "#FF6A45", ink: "#FDF8F0" }, // plum into coral
  { from: "#9BE3C0", to: "#B7C4FF", ink: "#12241C" }, // mint into peri
  { from: "#FFDE59", to: "#FF6A45", ink: "#2A1B00" }, // marker into coral
  { from: "#B7C4FF", to: "#DDBBF5", ink: "#161033" }, // peri into lilac
  { from: "#12080F", to: "#241430", ink: "#FDF8F0" }, // the night itself
  { from: "#FFB3C7", to: "#FFDE59", ink: "#33121C" }, // pink into marker
  { from: "#DDBBF5", to: "#FF6A45", ink: "#2B0E33" }, // lilac into coral
];

export interface PosterProps {
  /** What the art is seeded from. The event id, so it never drifts. */
  seed: string;
  /** Set across the poster. Trimmed by CSS, never by cutting the string. */
  title: string;
  /** Small line under the title — the date, usually. Optional. */
  caption?: string | null;
  className?: string;
}

export function Poster({ seed, title, caption, className }: PosterProps) {
  const h = hash(seed);
  const scheme = SCHEMES[h % SCHEMES.length];
  // Two more decisions off the same hash: which corner the wash falls from,
  // and where the ring sits. Enough variety that a grid of them looks made
  // rather than stamped.
  const angle = 20 + (h >> 3) % 4 * 35;
  const ringX = 18 + ((h >> 6) % 5) * 16;
  const ringY = 22 + ((h >> 9) % 4) * 18;

  return (
    <div
      className={`relative isolate flex h-full w-full flex-col justify-end overflow-hidden ${className ?? ""}`}
      style={{
        background: `linear-gradient(${angle}deg, ${scheme.from} 0%, ${scheme.to} 100%)`,
        color: scheme.ink,
      }}
    >
      {/* One soft ring, at 18% — enough to give the flat wash somewhere for
          the eye to land, faint enough never to fight the title. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 rounded-full"
        style={{
          left: `${ringX}%`,
          top: `${ringY}%`,
          width: "72%",
          aspectRatio: "1",
          transform: "translate(-50%, -50%)",
          border: `2.5vw solid ${scheme.ink}`,
          opacity: 0.18,
        }}
      />
      <div className="p-[7%]">
        <p
          className="font-extrabold leading-[1.02] tracking-[-0.035em]"
          style={{ fontSize: "clamp(20px, 9cqw, 52px)", textWrap: "balance" }}
        >
          {title}
        </p>
        {caption ? (
          <p
            className="mt-[3%] font-semibold opacity-70"
            style={{ fontSize: "clamp(11px, 3.6cqw, 17px)" }}
          >
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
