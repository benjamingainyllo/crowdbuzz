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
      <AdminMobileHeader role={admin.role} />
      <AdminSidebar role={admin.role} email={admin.email} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* The bar is chrome and sits on white with a rule under it, so
            the grey working area below reads as a separate surface. */}
        <header className="flex h-[60px] shrink-0 items-center gap-4 border-b border-[var(--dl-line)] bg-[var(--dl-panel)] px-5 md:px-6">
          <p className="hidden shrink-0 text-[15px] font-extrabold tracking-[-0.02em] lg:block">
            Owner console
          </p>

          <div className="mx-auto w-full max-w-[420px]">
            <GlobalSearch />
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
            <span className="rounded-full border border-[var(--dl-line)] bg-[#F6F7F8] px-2.5 py-[3px] text-[11.5px] font-bold text-[var(--dl-ink-soft)]">
              {admin.role.replace("_", " ")}
            </span>
            <span
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--dl-ink)] text-[12px] font-extrabold text-white"
              title={admin.email ?? undefined}
            >
              {(admin.email ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
