/**
 * Pulling an event's colours out of its own cover image.
 *
 * WHAT THIS REPLACES. Every event already got a colour pair, but it came
 * from hashing the event's id against eight hand-picked schemes — so a
 * night with a deep red flyer could be wrapped in mint green. It looked
 * deliberate and had nothing to do with the picture. This reads the
 * actual pixels.
 *
 * HOW. Draw the image small onto a canvas, walk the pixels, bucket them
 * by coarse hue and lightness, and take the two most populated buckets
 * that are actually worth looking at. Downscaling to 48px first is the
 * whole performance story: 2,304 pixels instead of several million, and
 * the browser's own scaler does the averaging for free.
 *
 * IT CAN FAIL, AND FAILING IS FINE. A cross-origin image without the
 * right headers taints the canvas and reading it throws. Callers fall
 * back to the hashed scheme, which is exactly what the page does today —
 * so the worst case is the behaviour we already ship.
 *
 * BROWSER ONLY. Canvas is not available on the server; every caller runs
 * this in an effect.
 */

export type ColourPair = { from: string; to: string };

/** The pair, plus how bright the picture is overall (0-255). */
export type ImageColours = ColourPair & { luma: number };

const SIZE = 48;

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Perceived brightness, 0–255. Weighted for how the eye actually works. */
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * The two colours to wash the page in.
 *
 * Resolves null rather than throwing: a cover that cannot be read is a
 * normal outcome, not an error worth surfacing to anybody.
 */
export function coloursFromImage(src: string): Promise<ImageColours | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !src) return resolve(null);

    const img = new Image();
    // Required or the canvas is tainted and getImageData throws. The
    // request still succeeds without CORS headers on the other end — it
    // is only the pixel read that fails, which is why this is wrapped.
    img.crossOrigin = "anonymous";

    // Never hang the effect on a slow or dead image.
    const timer = window.setTimeout(() => resolve(null), 4000);

    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Bucket by coarse colour. 32 levels per channel is enough to
        // group "the reds" without merging a red into an orange.
        const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();

        // Overall brightness decides whether the page goes dark or light,
        // which matters more than the hue does: a dark flyer on a light
        // page looks like a mistake, and the reverse is unreadable.
        let lumaTotal = 0;
        let lumaCount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 200) continue;

          const l = luma(r, g, b);
          // Counted before the black/white skip: the page's lightness
          // should reflect the WHOLE picture, including a flyer that is
          // mostly cream or mostly black.
          lumaTotal += l;
          lumaCount += 1;
          // Skip the near-black and near-white: they carry no hue, and a
          // page washed in either is the flat page we started with.
          if (l < 26 || l > 232) continue;

          const key = `${r >> 5}:${g >> 5}:${b >> 5}`;
          const cur = buckets.get(key);
          if (cur) {
            cur.n += 1;
            cur.r += r;
            cur.g += g;
            cur.b += b;
          } else {
            buckets.set(key, { n: 1, r, g, b });
          }
        }

        if (buckets.size === 0) return resolve(null);

        const ranked = Array.from(buckets.values())
          .map((x) => {
            const r = Math.round(x.r / x.n);
            const g = Math.round(x.g / x.n);
            const b = Math.round(x.b / x.n);
            // Weight by how common AND how colourful. A huge field of
            // near-grey should not beat a smaller, vivid area — the vivid
            // one is what a person would call "the colour of the flyer".
            return { r, g, b, score: x.n * (0.35 + saturation(r, g, b)) };
          })
          .sort((a, b) => b.score - a.score);

        const first = ranked[0];

        // A second colour far enough from the first to make a gradient
        // rather than a flat wash. Falls back to a darker shade of the
        // first when the image is essentially one colour.
        const second =
          ranked.find((c) => {
            const d =
              Math.abs(c.r - first.r) + Math.abs(c.g - first.g) + Math.abs(c.b - first.b);
            return d > 90;
          }) ?? {
            r: Math.round(first.r * 0.45),
            g: Math.round(first.g * 0.45),
            b: Math.round(first.b * 0.45),
          };

        resolve({
          from: toHex(first.r, first.g, first.b),
          to: toHex(second.r, second.g, second.b),
          luma: lumaCount ? lumaTotal / lumaCount : 128,
        });
      } catch {
        // Tainted canvas, or no canvas at all. The caller keeps its
        // fallback and nobody sees a difference from today.
        resolve(null);
      }
    };

    img.src = src;
  });
}
