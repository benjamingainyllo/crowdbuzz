import type { Metadata } from "next";
import { SiteNav, StartCta } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Underline } from "@/components/marketing/doodles";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_CAP_KOBO,
  PLATFORM_FEE_CAP_MAX_KOBO,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  calculatePlatformFeeKobo,
  koboToNaira,
  nairaToKobo,
} from "@/lib/money";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How you get paid, when the money lands, what happens on a refund, and how people get through the door. The questions everybody asks before their first event.",
};

/**
 * The page for someone about to trust a stranger with their door money.
 *
 * Three questions come up before every first event — how do I get paid,
 * when, and what if somebody wants a refund — and until now the answers
 * existed only in the product, which you cannot read before signing up.
 * That is the wrong order: the worry comes first.
 *
 * DELIBERATELY NOT A HELP CENTRE. A support site is a thing you build when
 * you have the volume to justify one; a page you can read end to end in
 * four minutes is what a first-time organiser actually needs. When any
 * answer here grows past a couple of paragraphs, that is the signal to
 * split it out — not before.
 *
 * The fee figures come from lib/money.ts like everywhere else, so this
 * page cannot quietly disagree with the pricing page.
 */

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const RATE_PCT = DEFAULT_PLATFORM_FEE_VALUE / 100;
const CAP = koboToNaira(PLATFORM_FEE_CAP_KOBO);
const CAP_MAX = koboToNaira(PLATFORM_FEE_CAP_MAX_KOBO);
const FREE_BELOW = koboToNaira(PLATFORM_FEE_FREE_BELOW_KOBO);

const EXAMPLE_PRICE = 20000;
const EXAMPLE_FEE = koboToNaira(
  calculatePlatformFeeKobo(
    nairaToKobo(EXAMPLE_PRICE),
    DEFAULT_PLATFORM_FEE_TYPE,
    DEFAULT_PLATFORM_FEE_VALUE
  )
);

interface Answer {
  q: string;
  a: React.ReactNode;
}

const MONEY: Answer[] = [
  {
    q: "When do I get my money?",
    a: (
      <>
        As each ticket sells. The payment splits at the moment your buyer pays:
        your share goes to your bank account and our fee comes to us, in the same
        transaction. There is no wallet holding your money, no balance to watch,
        and nothing to withdraw.
      </>
    ),
  },
  {
    q: "So I am not waiting until after the event?",
    a: (
      <>
        No. That is the part most platforms do differently and it is the main
        reason this one exists. Money from a ticket sold in October is in your
        account in October, not after the December night.
      </>
    ),
  },
  {
    q: "Where exactly does it land?",
    a: (
      <>
        The bank account you verify when you set up payouts. We never hold it,
        so we cannot send it anywhere else &mdash; that is a property of how the
        payment is built, not a promise about how carefully we behave.
      </>
    ),
  },
  {
    q: "What do you actually take?",
    a: (
      <>
        {RATE_PCT}% of each paid ticket, held at {naira(CAP)} once the ticket is
        expensive enough. On a {naira(EXAMPLE_PRICE)} ticket that is{" "}
        {naira(EXAMPLE_FEE)}. On genuinely expensive tickets the cap steps up, but
        we never take more than {naira(CAP_MAX)} from a single one, whatever you
        charge. Under {naira(FREE_BELOW)} a ticket we charge nothing, and free
        events cost nothing at all.
      </>
    ),
  },
  {
    q: "Is there a monthly fee?",
    a: (
      <>
        No. No plan, no signup fee, no charge for extra events or extra ticket
        types. If you sell nothing, you pay nothing.
      </>
    ),
  },
];

const REFUNDS: Answer[] = [
  {
    q: "A buyer wants their money back. What happens?",
    a: (
      <>
        You refund them yourself, from the order in your dashboard. It asks you to
        confirm the amount and to say why &mdash; the reason is what explains the
        row to you in three months &mdash; and the money goes back to the card
        they paid with. The decision is yours: we never refund anybody&rsquo;s
        buyer on our own.
      </>
    ),
  },
  {
    q: "Does your fee come back too?",
    a: (
      <>
        Yes, in proportion. Refund the whole order and the whole fee comes back;
        refund half and half of it does. It is worked out and recorded the moment
        you press the button &mdash; you do not have to ask, and you do not have
        to remember. We should not keep a cut of a sale that did not happen.
      </>
    ),
  },
  {
    q: "What if I have to cancel the whole event?",
    a: (
      <>
        Refund the orders from your dashboard, or message us and we will do them
        together if there are a lot. You can message
        everybody who bought a ticket from the event&rsquo;s own page, so they
        hear what happened from the person they bought from &mdash; which is the
        only version of that message anybody actually wants to receive.
      </>
    ),
  },
  {
    q: "Somebody says they were charged twice.",
    a: (
      <>
        Check the order in your dashboard first &mdash; a card that was declined and
        retried often shows as two attempts on their statement but only one real
        charge, and it settles itself within a few days. If there really are two
        orders, send us both references and we will refund one.
      </>
    ),
  },
];

const DOOR: Answer[] = [
  {
    q: "How do people get in?",
    a: (
      <>
        Every ticket carries a QR code. On the night you open the scanner on your
        phone, point it at their screen, and it says yes or no. Nothing to install
        and no special hardware.
      </>
    ),
  },
  {
    q: "Can the same ticket be used twice?",
    a: (
      <>
        No. A ticket is marked as used the moment it is scanned, so a screenshot
        passed to a friend is refused at the door. The scanner tells you when a
        code has already been through.
      </>
    ),
  },
  {
    q: "What if the internet is bad at the venue?",
    a: (
      <>
        This is the honest one: the scanner needs a connection to check a ticket
        against the list. If your venue has no signal, load your attendee list
        before you go &mdash; you can export it &mdash; and check names against it
        instead. An offline scanner is on the list of things to build.
      </>
    ),
  },
  {
    q: "Somebody turns up without their ticket.",
    a: (
      <>
        Search their name or email in the attendee list and let them in from
        there. Their ticket also arrives by email, so getting them to search their
        inbox for it usually solves it faster than a queue does.
      </>
    ),
  },
];

function Section({ title, note, items }: { title: string; note: string; items: Answer[] }) {
  return (
    <section className="border-b border-[var(--hairline)] px-6 py-16 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[38px]">
          {title}
        </h2>
        <p className="mt-4 max-w-[54ch] text-[16px] leading-[1.6] text-[var(--on-ground-soft)]">
          {note}
        </p>

        <dl className="mt-10 flex flex-col gap-9">
          {items.map((item) => (
            <div key={item.q}>
              <dt className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.015em]">
                {item.q}
              </dt>
              <dd className="mt-2.5 max-w-[62ch] text-[16.5px] leading-[1.62] text-[var(--on-ground-soft)]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main className="lp min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]">
      <SiteNav />

      <section className="border-b border-[var(--hairline)] bg-[var(--ground-deep)] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--on-ground-soft)]">
            How it works
          </p>
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[54px]">
            The questions you have
            <br />
            <span className="relative inline-block">
              before the first one sells.
              <Underline className="absolute -bottom-3 left-0 h-3 w-full text-[var(--coral)]" />
            </span>
          </h1>
          <p className="mx-auto mt-9 max-w-[50ch] text-[17px] leading-[1.6] text-[var(--on-ground-soft)] sm:text-[19px]">
            Getting paid, giving money back, and getting people through the door.
            Four minutes end to end.
          </p>
        </div>
      </section>

      <Section
        title="Getting paid"
        note="The part worth reading twice, because it is the part that is different here."
        items={MONEY}
      />

      <Section
        title="Refunds and problems"
        note="Nobody plans for these and everybody eventually needs them."
        items={REFUNDS}
      />

      <Section
        title="On the night"
        note="What actually happens at the door, including the bit that does not work yet."
        items={DOOR}
      />

      <section className="px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[38px]">
            Something not answered here?
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--on-ground-soft)]">
            Ask before you need the answer, not during the night. A real person
            reads it.
          </p>
          <div className="mt-10 flex justify-center">
            <StartCta />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
