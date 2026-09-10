"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

/**
 * The bar above the work, matching the owner console's.
 *
 * WHY IT EXISTS AT ALL. The console has a fixed white header over its
 * grey working area; the dashboard opened straight into the page. Once
 * the two shared a palette that was the loudest remaining difference —
 * same colours, different anatomy — and it is the kind of difference you
 * feel without being able to name.
 *
 * IT NAMES THE SCREEN, WHICH THE PAGE NO LONGER HAS TO SHOUT. The heading
 * inside each page used to carry 46px of display type partly because
 * nothing else said where you were. With the bar doing that, the page
 * heading drops to the console's scale and the screen gets its room back.
 */

const NAMES: Record<string, string> = {
  "/overview": "Overview",
  "/events": "Events",
  "/customers": "Attendees",
  "/audience": "Audience",
  "/revenue": "Sales",
  "/income": "Sales",
  "/payouts": "Payouts",
  "/refer": "Refer",
  "/settings": "Settings",
  "/integrations": "Integrations",
  "/analytics": "Analytics",
  "/demo": "Test sale",
  "/home": "Home",
};

function nameFor(pathname: string): string {
  // Longest match first, so /events/123/edit resolves to Events rather
  // than falling through to the bare default.
  const hit = Object.keys(NAMES)
    .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? NAMES[hit] : "Dashboard";
}

export function DashboardTopBar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const handle = profile?.handle || "";
  const name = profile?.first_name || profile?.box_office_name || "You";

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-[var(--dl-line)] bg-[var(--dl-panel)] px-5 md:px-6">
      <p className="min-w-0 truncate text-[15px] font-extrabold tracking-[-0.02em]">
        {nameFor(pathname)}
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {handle && (
          <Link
            href={`/${handle}` as never}
            target="_blank"
            rel="noopener noreferrer"
            className="dl-btn hidden sm:inline-flex"
          >
            Your public page
            <ArrowUpRight className="h-[15px] w-[15px]" strokeWidth={2.5} />
          </Link>
        )}
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full border border-[var(--dl-line)] object-cover"
          />
        ) : (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--dl-ink)] text-[12px] font-extrabold text-white"
            title={name}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </header>
  );
}
