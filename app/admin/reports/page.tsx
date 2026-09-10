import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Reports — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Reports"
      sub="Numbers you can send to somebody else."
      will={[
        "Scheduled exports \u2014 monthly fee income, payouts made, refunds issued \u2014 as files rather than screens.",
        "A per-organiser statement, which is what an organiser asks for at tax time.",
        "Anything on this console exportable as CSV from the screen you are looking at.",
      ]}
      needs={[
        "An export path and a place to keep generated files. The underlying figures already exist.",
      ]}
    />
  );
}
