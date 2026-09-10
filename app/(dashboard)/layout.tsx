import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardTopBar } from "@/components/dashboard/top-bar";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * The dashboard shell.
 *
 * `.dl` — Daylight — puts the signed-in palette in scope, and it is now
 * ONE palette: this shell and the owner console wear the same skin, so a
 * card, a button and a menu row are the same object on both sides.
 *
 * THE BAR IS PART OF THAT, NOT DECORATION. The console has a fixed white
 * header above its grey working area and this had none, so the two
 * halves were built differently even once they shared a palette: one
 * opened with chrome, the other opened straight into a page. Same bar,
 * same height, same rule under it.
 *
 * The marketing site stays on `.lp`, the dark world, and the public event
 * page on `.sf`. Those are deliberately their own things — see globals.css.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dl flex h-screen flex-col overflow-hidden font-[family-name:var(--font-bricolage-grotesque)] lg:flex-row">
        <MobileHeader />
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardTopBar />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
