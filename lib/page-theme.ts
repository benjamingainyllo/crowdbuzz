import type { ImageColours } from "@/lib/image-colour";

/**
 * Turning a flyer's colours into a page you can actually read.
 *
 * THE NAIVE VERSION DOES NOT WORK, and it is worth saying why. Painting
 * the page with the raw dominant colour gives you a muddy brown for most
 * photographs and a screaming pure red for a poster with a red logo.
 * Neither looks designed. What looks designed is taking only the HUE from
 * the picture and rebuilding the saturation and lightness to values that
 * were chosen once, by someone, to be pleasant.
 *
 * So: hue comes from the image, everything else comes from here.
 *
 * THE OTHER HALF IS THE TEXT. A dark flyer wants a dark page with light
 * text; a bright flyer wants a saturated mid-tone page with dark text.
 * Getting the background right and leaving the text alone is how you end
 * up with grey-on-yellow. The whole point of deriving a theme rather than
 * a colour is that the ink comes with it.
 *
 * The ink is tinted toward the page's own hue rather than pure white or
 * pure black — a near-white with a breath of the background's colour in
 * it is the difference between "designed" and "default".
 */

export interface PageTheme {
  /** The two stops of the page's background gradient. */
  bgFrom: string;
  bgTo: string;
  /** Body text, and its two quieter steps. */
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Raised surfaces and hairlines, as translucent overlays on the page. */
  panel: string;
  line: string;
  /** What sits ON the ink colour when it is used as a fill. */
  paper: string;
  isDark: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** h 0–360, s and l 0–100. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function hsl(h: number, s: number, l: number, a?: number): string {
  const hue = ((h % 360) + 360) % 360;
  return a === undefined
    ? `hsl(${hue.toFixed(1)} ${clamp(s, 0, 100).toFixed(1)}% ${clamp(l, 0, 100).toFixed(1)}%)`
    : `hsl(${hue.toFixed(1)} ${clamp(s, 0, 100).toFixed(1)}% ${clamp(l, 0, 100).toFixed(1)}% / ${a})`;
}

/**
 * A page theme from an image's colours.
 *
 * `luma` decides dark or light. The threshold sits below the midpoint on
 * purpose: an event flyer is more often dark than not, and a page that
 * goes light on a middling image reads as washed out.
 */
export function themeFromColours(colours: ImageColours): PageTheme {
  const [r, g, b] = hexToRgb(colours.from);
  const [h, s] = rgbToHsl(r, g, b);

  // The second stop's hue, taken from the image's own second colour so a
  // two-tone flyer produces a two-tone page rather than one hue faded —
  // but PULLED BACK toward the first, because the raw distance is often
  // enormous. A pink flyer with a mint detail gives 336° and 164°, and a
  // gradient across 172° of hue is a rainbow, not a wash: it looks like a
  // bug even though both colours are honestly in the picture. Thirty-eight
  // degrees is roughly the widest shift that still reads as one colour
  // deepening rather than two colours fighting.
  const [r2, g2, b2] = hexToRgb(colours.to);
  const [rawH2] = rgbToHsl(r2, g2, b2);
  // Shortest way round the wheel, so 350° and 10° read as 20° apart.
  const delta = ((rawH2 - h + 540) % 360) - 180;
  const h2 = h + clamp(delta, -38, 38);

  const isDark = colours.luma < 118;

  if (isDark) {
    // Deep, and only lightly coloured: at this lightness a high
    // saturation stops reading as a colour and starts reading as a
    // problem with the screen.
    const sat = clamp(s, 18, 52);
    return {
      bgFrom: hsl(h, sat, 13),
      bgTo: hsl(h2, sat * 0.85, 7),
      ink: hsl(h, 22, 96),
      inkSoft: hsl(h, 14, 78),
      inkFaint: hsl(h, 10, 58),
      panel: hsl(h, 30, 96, 0.07),
      line: hsl(h, 30, 96, 0.16),
      paper: hsl(h, 30, 10),
      isDark: true,
    };
  }

  // Light pages carry far more colour than dark ones do — Oktoberfest
  // orange, olive green — because dark text can sit on a saturated
  // mid-tone perfectly well, and a pastel would read as unfinished.
  const sat = clamp(s, 30, 74);
  return {
    bgFrom: hsl(h, sat, 74),
    bgTo: hsl(h2, sat * 0.92, 60),
    ink: hsl(h, 38, 12),
    inkSoft: hsl(h, 24, 25),
    // Darker than the dark theme's equivalent is light. A faint step that
    // works at 58% lightness against near-black does NOT work at 42%
    // against a 74% background — it reads as text that failed to load.
    inkFaint: hsl(h, 20, 36),
    panel: hsl(h, 40, 12, 0.07),
    line: hsl(h, 40, 12, 0.16),
    paper: hsl(h, 40, 97),
    isDark: false,
  };
}

/**
 * The theme as CSS variables, ready to spread into a style prop.
 *
 * Overrides the .sf scope's own tokens rather than inventing new ones, so
 * every component already written against --dl-ink and friends follows
 * the page without knowing this exists.
 */
export function themeVars(t: PageTheme): Record<string, string> {
  return {
    "--ev-from": t.bgFrom,
    "--ev-to": t.bgTo,
    "--dl-ink": t.ink,
    "--dl-ink-soft": t.inkSoft,
    "--dl-ink-faint": t.inkFaint,
    "--dl-panel": t.panel,
    "--dl-line": t.line,
    "--dl-paper": t.paper,
    background: `linear-gradient(157deg, ${t.bgFrom} 0%, ${t.bgTo} 100%)`,
    color: t.ink,
  };
}
