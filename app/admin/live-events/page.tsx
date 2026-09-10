import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Live Events — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Live Events"
      sub="What is happening right now."
      will={[
        "Events whose doors are open at this moment, with tickets sold, people scanned in and the rate over the last hour.",
        "Anything going wrong during a live event \u2014 failed scans, payment errors at the door \u2014 surfaced while it can still be fixed.",
        "A one-tap route into that event's door screen.",
      ]}
      needs={[
        "Nothing new \u2014 this is a filtered view of events and tickets. It needs a refresh loop so it stays live without a reload.",
      ]}
    />
  );
}
