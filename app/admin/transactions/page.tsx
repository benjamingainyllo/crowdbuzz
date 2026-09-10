import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Transactions — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Transactions"
      sub="Every movement of money through the platform, in one ledger."
      will={[
        "One row per money movement \u2014 a charge, a split to an organiser, a refund, a payout \u2014 with its reference, its provider and the order it belongs to.",
        "A running platform balance per day, so a discrepancy shows up as a step rather than as a number nobody can explain.",
        "Filters by provider, by state, and by date, and an export for reconciling against a bank statement.",
      ]}
      needs={[
        "A single ledger table. Today the movements live across orders, payouts and refunds and are only joinable by hand.",
      ]}
    />
  );
}
