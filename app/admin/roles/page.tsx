import { Check, Minus } from "lucide-react";
import {
  ADMIN_ROLES, CAPABILITY_LABELS, ROLE_BLURBS, ROLE_LABELS, roleCan,
} from "@/lib/admin-roles";
import { getAdminIdentity } from "@/lib/admin";
import { panel, PageHead, Scroll, th, td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Roles & Permissions — owner",
  robots: { index: false, follow: false },
};

/**
 * What each kind of admin can do.
 *
 * RENDERED FROM THE CHECK ITSELF, NOT FROM A DESCRIPTION OF IT. Every
 * tick below is a live call to roleCan() — the same function the server
 * runs before it lets anybody do the thing. A hand-written table would
 * be a second answer to the same question, and the moment the two
 * disagreed the wrong one would be the one people trust, because it is
 * the one they can see.
 *
 * READ-ONLY, AND SAYS SO. The capabilities live in code today, so
 * changing them is a deploy rather than a toggle. Showing a switch that
 * silently does nothing would be worse than showing none.
 */
export default async function RolesPage() {
  const me = await getAdminIdentity();

  return (
    <section className="space-y-5">
      <PageHead
        title="Roles & Permissions"
        sub="Every tick is the live permission check, not a description of it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ADMIN_ROLES.map((r) => (
          <div key={r} className="dl-card p-4">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-extrabold tracking-[-0.02em]">{ROLE_LABELS[r]}</p>
              {me?.role === r && (
                <span className="rounded-full bg-[var(--dl-acid)] px-2 py-[1px] text-[10.5px] font-extrabold">
                  You
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
              {ROLE_BLURBS[r]}
            </p>
            <p className="mt-3 text-[12px] text-[var(--dl-ink-faint)]">
              {CAPABILITY_LABELS.filter((c) => roleCan(r, c.key)).length} of{" "}
              {CAPABILITY_LABELS.length} permissions
            </p>
          </div>
        ))}
      </div>

      <div className={`${panel} overflow-hidden`}>
        <Scroll>
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Permission</th>
                {ADMIN_ROLES.map((r) => (
                  <th key={r} className={`${th} text-center`}>
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_LABELS.map((c) => (
                <tr key={c.key}>
                  <td className={td}>
                    <p className="font-bold">{c.label}</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--dl-ink-faint)]">{c.note}</p>
                  </td>
                  {ADMIN_ROLES.map((r) => {
                    const can = roleCan(r, c.key);
                    return (
                      <td key={r} className={`${td} text-center`}>
                        {can ? (
                          <Check
                            className="mx-auto h-[17px] w-[17px] text-[#146B45]"
                            strokeWidth={3}
                            aria-label="Allowed"
                          />
                        ) : (
                          <Minus
                            className="mx-auto h-[17px] w-[17px] text-[var(--dl-line)]"
                            strokeWidth={3}
                            aria-label="Not allowed"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </div>

      <div className={`${panel} p-4`}>
        <p className="text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
          <b>These cannot be edited here.</b> The capabilities are defined in
          code (<code className="rounded-[6px] bg-[#F1F2F4] px-1.5 py-[1px] text-[12.5px]">lib/admin-roles.ts</code>),
          so changing one is a deploy rather than a toggle. Who holds which
          role <em>is</em> editable — that lives in the database, on Admin Users.
        </p>
      </div>
    </section>
  );
}
