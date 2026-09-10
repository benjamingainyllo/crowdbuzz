import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Marketplace — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Marketplace"
      sub="How Explore is curated."
      will={[
        "Which events are surfaced on Explore and why, with the ability to feature and to hide.",
        "Reported listings, and anything auto-flagged before a person sees it.",
        "What Explore is actually converting: views to ticket sales, per city.",
      ]}
      needs={[
        "Explore currently shows every published event with no editorial layer. Featuring needs a flag on events and a reason recorded against it.",
      ]}
    />
  );
}
