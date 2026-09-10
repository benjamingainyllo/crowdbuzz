import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Roles & Permissions — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Roles & Permissions"
      sub="What each kind of admin can do."
      will={[
        "The capability matrix as a table: every role down one side, every action across the top, so a permission question has an answer you can point at.",
        "Changing a role's capabilities without a deploy.",
        "Who granted whom what, and when.",
      ]}
      needs={[
        "The roles and their capabilities are defined in code today (lib/admin-roles.ts) and are correct \u2014 showing them here is straightforward. Editing them means moving the definition into the database.",
      ]}
    />
  );
}
