import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "System Health — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="System Health"
      sub="Whether the things this depends on are working."
      will={[
        "A live check of each dependency: the database, the payment provider, the email sender, the WhatsApp sender \u2014 configured or not, reachable or not.",
        "Whether the database schema is up to date with setup.sql, which is the single most common cause of a screen half-working.",
        "Recent errors, grouped, so a spike is visible without reading logs.",
      ]}
      needs={[
        "Nothing new for the configuration and schema checks. Error grouping needs errors to be collected somewhere first.",
      ]}
    />
  );
}
