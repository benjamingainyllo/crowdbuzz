import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Analytics — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Analytics"
      sub="What is actually happening to the business."
      will={[
        "Gross ticket value, platform fee earned, and take rate over time \u2014 the three numbers that decide whether this works.",
        "Organiser cohorts: how many list a second event, and how long after the first.",
        "Where buyers come from and where they drop out of checkout.",
      ]}
      needs={[
        "The revenue figures can be computed from orders today. Funnel and traffic need page events, which are not recorded yet.",
      ]}
    />
  );
}
