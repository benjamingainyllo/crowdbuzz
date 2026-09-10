import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "Support — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="Support"
      sub="Buyers and organisers who need a human."
      will={[
        "An inbox of requests, each attached to the order, ticket or event it is about, so nobody has to ask for a reference.",
        "The actions support actually needs in one place: resend a ticket, refund, change an email, without leaving the thread.",
        "Who replied and when, so a request cannot quietly go unanswered.",
      ]}
      needs={[
        "A support request store, and a route for buyers to raise one. Neither exists yet \u2014 today support happens in WhatsApp with no record.",
      ]}
    />
  );
}
