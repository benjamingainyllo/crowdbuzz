import { notFound } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin";
import { AdminSidebar, AdminMobileHeader } from "@/components/admin/admin-sidebar";
import { GlobalSearch } from "@/components/admin/global-search";

/**
 * The gate, at the door of the whole section.
 *
 * Checked here rather than on each page, so a screen added later cannot be
 * left unguarded by forgetting a line. Pages that need MORE than mere
 * membership check their own capability on top of this.
 *
 * notFound() rather than a "not allowed" page, on purpose: somebody who
 * should not be here learns nothing, not even that the route exists.
 *
 * ---
 *
 * THE SHELL IS THE PRODUCT'S SHELL. This was a centred max-w-[1400px]
 * document with the menu as a column inside it, so on any wide screen the
 * whole console floated in the middle with wallpaper down both sides. The
 * organiser dashboard is a full-bleed app: sidebar pinned to the edge,
 * fixed viewport height, main scrolling on its own. This now is too, and
 * the two are the same object rather than two things that happen to share
 * a palette.
 *
 * THE SEARCH BOX IS CHROME, NOT CONTENT. It used to sit inside the page,
 * above the heading, scrolling away the moment you looked at a table. It
 * belongs in a bar that never moves — in a console, "find the thing" is
 * the most-used control on every screen.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  return (
    /* `dl` AND `adm`, in that order and both required. The console reads
       .dl's tokens like the rest of the signed-in product; .adm is the
       second skin over them and is declared after .dl in globals.css so
       its overrides win. Drop either class and the screen is half a
       design. */
    <div className="dl adm relative flex h-screen flex-col overflow-hidden font-[family-name:var(--font-bricolage-grotesque)] lg:flex-row">
      {/* The haze. Fixed and behind everything, so a scrolling table does
          not drag it up the screen. */}
      <div className="adm-aurora" aria-hidden="true" />

      <AdminMobileHeader role={admin.role} />
      <AdminSidebar role={admin.role} email={admin.email} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* No rule under the header. The old 2px line was the divider
            between chrome and work; here the work is a set of floating
            cards and the chrome is simply the space above them. */}
        <header className="flex h-[68px] shrink-0 items-center gap-4 px-5 md:px-7">
          <div className="w-full max-w-[460px]">
            <GlobalSearch />
          </div>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="rounded-full bg-[rgba(20,16,24,0.05)] px-3 py-[5px] text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dl-ink-soft)]">
              {admin.role.replace("_", " ")}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-8 pt-1 md:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
