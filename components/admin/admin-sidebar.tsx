"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowLeftRight, ArrowUpRight, BadgePercent, BarChart3,
  Bell, Calendar, ChevronsLeft, ChevronsRight, CreditCard, FileText, Gavel,
  HeartPulse, KeyRound, LayoutGrid, LifeBuoy, LogOut, Menu, Plug, Radio, Receipt,
  RotateCcw, ScanLine, ScrollText, Settings2, ShieldCheck, Store, Ticket,
  UserRound, UsersRound, Wallet, X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { AdminRole } from "@/lib/admin-roles";

/**
 * The owner console's sidebar.
 *
 * DELIBERATELY THE SAME OBJECT AS THE ORGANISER'S. It was a column inside
 * a centred 1400px document, which left the whole console floating in the
 * middle of a wide screen with a band of wallpaper down the left — a
 * report about the platform rather than the thing you run it with. This
 * is the product's own shell: pinned to the edge, full height, its own
 * scroll, a 2px rule dividing it from the work. An internal tool that
 * doesn't sit like the product is a tool people distrust.
 *
 * SECTIONS ARE HIDDEN BY ROLE, BUT HIDING IS NOT THE SECURITY. Every page
 * behind these links re-checks the capability on the server. This only
 * stops a support user staring at links that would refuse them.
 *
 * NO ACID ANYWHERE IN HERE. Acid marks the one next action, and in a
 * console there isn't one — you arrive to find out what needs doing, and
 * a permanent green button would be pointing at nothing.
 */

/**
 * THE MENU IS THE SHAPE OF THE PLATFORM, NOT THE SHAPE OF WHAT IS BUILT.
 * These seven groups are the structure the console is being built to, so
 * a screen that arrives later has a place already waiting rather than
 * being wedged into whichever group happened to have room.
 *
 * `soon` marks a screen that is in the menu but not yet real. Those route
 * to a page that says so and says what it will hold — never to a page of
 * invented figures, and never to a dead link. When one becomes real, the
 * flag comes off and nothing else about this file changes.
 *
 * Two labels differ from the obvious name and both are deliberate:
 * "Chargebacks" is the existing disputes screen, which is what a
 * chargeback becomes once a buyer's bank is involved, and "Fraud & Risk"
 * is the needs-attention queue, which is already exactly that.
 */
const GROUPS: {
  label: string | null;
  items: {
    href: string;
    label: string;
    icon: typeof LayoutGrid;
    needs?: AdminRole[];
    soon?: boolean;
  }[];
}[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutGrid },
      { href: "/admin/activity", label: "Live Activity", icon: Activity },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/organisers", label: "Organisers", icon: UsersRound },
      { href: "/admin/customers", label: "Customers", icon: UserRound },
      { href: "/admin/tickets", label: "Tickets", icon: Ticket },
      { href: "/admin/orders", label: "Orders", icon: Receipt },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight, soon: true },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/payouts", label: "Payouts", icon: Wallet },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
      { href: "/admin/disputes", label: "Chargebacks", icon: Gavel },
      // Not in the tree that was asked for, but it is a real screen over
      // real rows and dropping it from the menu would strand it.
      { href: "/admin/splits", label: "Split payments", icon: UsersRound },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/check-ins", label: "Check-ins", icon: ScanLine, soon: true },
      { href: "/admin/live-events", label: "Live Events", icon: Radio, soon: true },
      { href: "/admin/attention", label: "Fraud & Risk", icon: AlertTriangle },
      { href: "/admin/support", label: "Support", icon: LifeBuoy, soon: true },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/promotions", label: "Promotions", icon: BadgePercent, soon: true },
      { href: "/admin/marketplace", label: "Marketplace", icon: Store, soon: true },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, soon: true },
      { href: "/admin/reports", label: "Reports", icon: FileText, soon: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/cms", label: "CMS", icon: ScrollText, soon: true },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, soon: true },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/admins", label: "Admin Users", icon: ShieldCheck, needs: ["super_admin"] },
      { href: "/admin/roles", label: "Roles & Permissions", icon: KeyRound, needs: ["super_admin"], soon: true },
      { href: "/admin/audit", label: "Audit Logs", icon: ScrollText, soon: true },
      { href: "/admin/health", label: "System Health", icon: HeartPulse, soon: true },
      { href: "/admin/integrations", label: "Integrations", icon: Plug, soon: true },
      { href: "/admin/settings", label: "Settings", icon: Settings2, needs: ["super_admin"] },
    ],
  },
];

function visibleGroups(role: AdminRole) {
  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.needs || i.needs.includes(role)),
  })).filter((g) => g.items.length > 0);
}

/**
 * The mark on a menu item whose screen is not built yet.
 *
 * Quiet on purpose: it is a note about the roadmap, not a warning. Loud
 * enough to stop somebody clicking it expecting figures, quiet enough
 * that six of them in a row do not shout over the six that work.
 */
function SoonTag() {
  return (
    <span className="ml-auto shrink-0 rounded-[2px] border border-[var(--dl-line)] px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-[0.1em] text-[var(--dl-ink-faint)]">
      Soon
    </span>
  );
}

/** Exact match for /admin so it isn't lit on every page. */
function isOn(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({ role, email }: { role: AdminRole; email: string | null }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const item = (active: boolean) =>
    `group flex h-[38px] items-center rounded-full text-[13.5px] transition-colors ${
      active
        ? "bg-[var(--dl-ink)] font-extrabold text-white"
        : "font-semibold text-[var(--dl-ink-soft)] hover:bg-[rgba(255,255,255,0.7)] hover:text-[var(--dl-ink)]"
    } ${collapsed ? "justify-center px-0" : "gap-3 px-3.5"}`;

  const icon = "h-[16px] w-[16px] shrink-0";
  const text = `truncate ${collapsed ? "hidden" : ""}`;

  return (
    <aside
      className={`relative z-10 hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[76px]" : "w-[236px]"
      }`}
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between px-4">
        <Link
          href="/admin"
          className={`overflow-hidden whitespace-nowrap text-[16px] font-extrabold tracking-[-0.03em] ${
            collapsed ? "hidden" : ""
          }`}
        >
          CrowdBuzz <span className="text-[var(--dl-ink-faint)]">owner</span>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--dl-ink-faint)] transition-colors hover:bg-[rgba(255,255,255,0.7)] hover:text-[var(--dl-ink)] ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          {collapsed ? <ChevronsRight className="h-[17px] w-[17px]" /> : <ChevronsLeft className="h-[17px] w-[17px]" />}
        </button>
      </div>

      <div className="flex-1 px-3 py-4">
        {visibleGroups(role).map((g, gi) => (
          <div key={g.label ?? "top"} className={gi !== 0 ? "mt-5" : ""}>
            {g.label && !collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                {g.label}
              </p>
            )}
            {g.label && collapsed && gi !== 0 && (
              <div className="mx-auto mb-3 mt-1 h-px w-6 bg-[var(--dl-line)]" />
            )}
            <nav className="space-y-0.5">
              {g.items.map((i) => {
                const on = isOn(pathname, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href as never}
                    title={collapsed ? i.label : undefined}
                    aria-current={on ? "page" : undefined}
                    className={item(on)}
                  >
                    <i.icon strokeWidth={2} className={icon} />
                    <span className={text}>{i.label}</span>
                    {i.soon && !collapsed && !on && <SoonTag />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="mt-auto p-3">
        <Link href="/overview" className={item(false)}>
          <ArrowUpRight strokeWidth={2} className={icon} />
          <span className={text}>Your own dashboard</span>
        </Link>
        <button
          onClick={() => signOut()}
          className={`flex h-[38px] w-full items-center rounded-full text-[13.5px] font-semibold text-[var(--dl-ink-soft)] transition-colors hover:bg-[rgba(255,75,99,0.12)] hover:text-[var(--dl-danger)] ${
            collapsed ? "justify-center px-0" : "gap-3 px-3.5"
          }`}
        >
          <LogOut strokeWidth={2} className={icon} />
          <span className={text}>Log out</span>
        </button>

        {!collapsed && (
          <div className="mt-3 border-t border-[var(--dl-line)] pt-3">
            <p className="truncate text-[12.5px] font-extrabold">{email ?? "—"}</p>
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-[var(--dl-ink-faint)]">
              {role.replace("_", " ")}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/** The same menu on a phone, behind one button. */
export function AdminMobileHeader({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation closes it. Without this the drawer stays over the page
  // you just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[var(--dl-line)] bg-[var(--dl-paper)] px-4 lg:hidden">
        <Link href="/admin" className="flex h-11 items-center text-[16px] font-extrabold tracking-[-0.03em]">
          CrowdBuzz <span className="ml-1 text-[var(--dl-ink-faint)]">owner</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the menu"
          className="flex h-11 w-11 items-center justify-center rounded-[3px] text-[var(--dl-ink-soft)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative ml-auto flex h-full w-[268px] flex-col overflow-y-auto bg-[var(--dl-paper)] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-extrabold">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close the menu"
                className="flex h-11 w-11 items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {visibleGroups(role).map((g, gi) => (
              <div key={g.label ?? "top"} className={gi !== 0 ? "mt-4" : ""}>
                {g.label && (
                  <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    {g.label}
                  </p>
                )}
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href as never}
                    className={`flex h-11 items-center gap-3 rounded-full px-3.5 text-[14px] ${
                      isOn(pathname, i.href)
                        ? "bg-[var(--dl-ink)] font-extrabold text-white"
                        : "font-semibold text-[var(--dl-ink-soft)]"
                    }`}
                  >
                    <i.icon strokeWidth={2} className="h-[16px] w-[16px] shrink-0" />
                    <span className="truncate">{i.label}</span>
                    {i.soon && !isOn(pathname, i.href) && <SoonTag />}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
