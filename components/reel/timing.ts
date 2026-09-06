/**
 * The reel's clock.
 *
 * EVERY FRAME IS A PURE FUNCTION OF t. Not a CSS transition, not a
 * keyframe animation — those run on wall-clock time, so a recorder that
 * seeks to a moment gets whatever the browser happened to have painted.
 * Driving the whole reel from one number means frame 900 is identical
 * every time it is rendered, which is what makes a clean 30fps capture
 * possible on a machine with no GPU.
 */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** How far through a window that starts at `start` and lasts `dur`. */
export const prog = (t: number, start: number, dur: number) =>
  clamp01((t - start) / dur);

/** Decelerating. The default for anything arriving on screen. */
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
/** Accelerate then decelerate. For things that move across the frame. */
export const easeInOut = (x: number) =>
  clamp01(x) < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * clamp01(x) + 2, 3) / 2;

/**
 * A scene's own state.
 *
 * `on` is whether to render at all — scenes are unmounted outside their
 * window so a forty-element frame never costs more than the scene showing.
 */
export function scene(t: number, start: number, dur: number, fade = 500) {
  const end = start + dur;
  const on = t >= start - fade && t <= end + fade;
  const inAt = prog(t, start - fade, fade);
  const outAt = 1 - prog(t, end, fade);
  return { on, t: t - start, p: prog(t, start, dur), opacity: Math.min(inAt, outAt) };
}
