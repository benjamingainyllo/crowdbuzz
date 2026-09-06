/**
 * Films the launch reel.
 *
 * FRAME BY FRAME, NOT A LIVE SCREEN RECORDING. The reel is a pure
 * function of one number, so this seeks to each frame's timestamp, waits
 * for the paint and screenshots it. A live capture on a container with no
 * GPU drops frames wherever the machine is busy; this cannot, because
 * nothing is racing a clock.
 *
 *   node scripts/record-reel.mjs [--fps 30] [--out out/paylance-launch.mp4]
 *
 * Needs a dev server on :3000 and ffmpeg on the PATH.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const FPS = Number(arg("fps", 30));
const OUT = path.resolve(arg("out", "out/paylance-launch.mp4"));
const BASE = arg("base", "http://localhost:3000");
const FORMAT = arg("format", "wide");          // wide (1920×1080) or tall (1080×1920)
const W = FORMAT === "tall" ? 1080 : 1920;
const H = FORMAT === "tall" ? 1920 : 1080;
const FRAMES = path.resolve(".reel-frames");
const EXEC = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({
  executablePath: existsSync(EXEC) ? EXEC : undefined,
  args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
});
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});

await page.goto(`${BASE}/reel?seek=1&format=${FORMAT}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof window.__seek === "function");
// Fonts must be in before frame 0, or the first second is a different face.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const total = await page.evaluate(() => window.__reelMs);
const frames = Math.round((total / 1000) * FPS);
process.stdout.write(`filming ${frames} frames at ${FPS}fps, ${W}×${H} (${(total / 1000).toFixed(1)}s)\n`);

const stage = page.locator('[data-reel="1"]');

for (let i = 0; i < frames; i++) {
  const ms = (i / FPS) * 1000;
  await page.evaluate((v) => window.__seek(v), ms);
  // Two rAFs so React has committed and the browser has painted.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
  await stage.screenshot({
    path: path.join(FRAMES, `f${String(i).padStart(5, "0")}.jpg`),
    type: "jpeg",
    quality: 92,
  });
  if (i % 150 === 0) process.stdout.write(`  ${i}/${frames}\n`);
}

await browser.close();

execFileSync(
  "ffmpeg",
  [
    "-y", "-framerate", String(FPS),
    "-i", path.join(FRAMES, "f%05d.jpg"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p",           // the format every player actually accepts
    "-movflags", "+faststart",       // starts playing before it is fully downloaded
    OUT,
  ],
  { stdio: "inherit" }
);

rmSync(FRAMES, { recursive: true, force: true });
process.stdout.write(`\nwrote ${OUT}\n`);
