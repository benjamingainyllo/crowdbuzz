import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Integrations — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Integrations"
      sub="The outside services this platform is wired to."
      will={[
        "Each provider \u2014 payments, email, WhatsApp \u2014 with whether a key is set, which environment it belongs to, and when it was last used successfully.",
        "Switching a provider without a deploy, since payments and email already sit behind interfaces designed for exactly that.",
        "Webhook endpoints and their recent deliveries.",
      ]}
      needs={[
        "Nothing new to show the state. Switching providers from here means keeping the choice in the database rather than in an environment variable.",
      ]}
    />
  );
}
