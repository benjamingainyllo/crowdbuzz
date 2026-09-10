import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Check-ins — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Check-ins"
      sub="Who was scanned in, where, and by whom."
      will={[
        "Every scan across every event, newest first, with the ticket code, the door staff who scanned it and the moment.",
        "Duplicate-scan attempts, which are the single most useful fraud signal a ticketing platform has.",
        "Per-event totals: issued, scanned, still outside.",
      ]}
      needs={[
        "Nothing new \u2014 tickets already record their scanned state. This is a view over data that exists.",
      ]}
    />
  );
}
