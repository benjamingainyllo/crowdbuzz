import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Promotions — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Promotions"
      sub="Discount codes, early-bird windows and comps."
      will={[
        "Every code in the platform, who created it, how many times it has been used and what it has cost in fees.",
        "Codes that look abused \u2014 one code, many cards, one device.",
        "Platform-wide promotions as well as an organiser's own.",
      ]}
      needs={[
        "Discount codes do not exist in the product yet. Checkout has no field for one and no table stores them.",
      ]}
    />
  );
}
