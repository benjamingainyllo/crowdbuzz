import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Notifications — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Notifications"
      sub="Everything the platform sends, and whether it arrived."
      will={[
        "Every message sent \u2014 ticket delivery, reminders, the WhatsApp roundup \u2014 with its state and its failure reason when it failed.",
        "The templates themselves, editable, with the approval state of each WhatsApp template.",
        "A resend, for the ticket that did not land.",
      ]}
      needs={[
        "Email and WhatsApp both go out through provider interfaces already, but nothing records what was sent. That log is the missing piece.",
      ]}
    />
  );
}
