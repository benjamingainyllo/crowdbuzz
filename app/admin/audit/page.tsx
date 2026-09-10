import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Audit Logs — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Audit Logs"
      sub="Every action an admin took."
      will={[
        "A permanent, unchangeable record of admin actions \u2014 refunds issued, states changed, roles granted \u2014 with who, what, when and from where.",
        "Filters by admin and by object, so \u201cwho refunded this order\u201d is one search.",
        "Kept separately from Live Activity, which is the platform's own events rather than staff actions.",
      ]}
      needs={[
        "Admin actions are partly recorded already. This needs one append-only table that nothing in the product can update or delete.",
      ]}
    />
  );
}
