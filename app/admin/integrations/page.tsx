import { notFound } from "next/navigation";
import { Planned } from "@/components/admin/planned";
import { plannedScreen } from "@/lib/admin-roadmap";

export const metadata = {
  title: "Integrations — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  // Gone from the manifest means the screen was built or dropped, and
  // either way this placeholder should no longer be answering for it.
  const s = plannedScreen("integrations");
  if (!s) notFound();
  return <Planned title={s.title} sub={s.sub} will={s.will} needs={s.needs} />;
}
