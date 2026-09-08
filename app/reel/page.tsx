import { notFound } from "next/navigation";
import { Reel } from "@/components/reel/reel";

/**
 * The launch reel, as a page.
 *
 * DEVELOPMENT ONLY. It renders at a fixed 1920×1080 and exists to be
 * filmed, not visited — a marketing video sitting on the live site as a
 * route people can stumble into is a support question waiting to happen.
 * `npm run reel` starts a dev server, films this and writes the mp4.
 */
export const metadata = {
  title: "CrowdBuzz — launch reel",
  robots: { index: false, follow: false },
};

export default function ReelPage({
  searchParams,
}: {
  searchParams?: { format?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();

  // ?format=tall gives the 1080×1920 phone cut — the one that actually
  // gets watched, on WhatsApp Status and Reels.
  const format = searchParams?.format === "tall" ? "tall" : "wide";

  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <Reel format={format} />
    </main>
  );
}
