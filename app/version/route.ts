import { NextResponse } from "next/server";

/**
 * What is actually live.
 *
 * "The site hasn't updated" has come up repeatedly and has never been
 * answerable, because from a development machine you cannot see production
 * and from a phone you cannot tell a stale DEPLOY from a stale CACHE. They
 * look identical and have completely different fixes.
 *
 * So production says which commit it is built from. Open /version on the
 * live site and compare the sha with the newest commit on GitHub:
 *
 *   they match      → the deploy is current; a page still looking old is
 *                     the browser's cache, so hard-refresh.
 *   sha is older    → the deploy did not happen or it failed. Vercel keeps
 *                     serving the last good build when a new one errors,
 *                     which is why the site can sit unchanged for days with
 *                     nothing visibly wrong.
 *
 * Vercel injects these at build time. Locally they are absent, which is
 * itself the answer: you are not on Vercel.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json(
    {
      commit: sha ? sha.slice(0, 7) : "local — not a Vercel build",
      commitFull: sha,
      message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      environment: process.env.VERCEL_ENV ?? "local",
      builtAt: BUILD_STAMP,
      now: new Date().toISOString(),
    },
    {
      // Never cached, or it would answer the question with a stale answer.
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}

/** Frozen when the bundle is compiled, not when the request arrives. */
const BUILD_STAMP = new Date().toISOString();
