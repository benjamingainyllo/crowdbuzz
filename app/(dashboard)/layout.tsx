import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { AuthGuard } from "@/components/auth/auth-guard";

/**
 * The dashboard shell.
 *
 * `.dl` — Daylight — puts the signed-in palette in scope, and it is now
 * ONE palette: this shell and the owner console wear the same skin, so a
 * card, a button and a menu row are the same object on both sides. They
 * used to differ, and running them side by side made the organiser's half
 * look like a different product by the same company.
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
