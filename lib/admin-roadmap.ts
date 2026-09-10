/**
 * The screens the console is being built to, and what each one needs.
 *
 * ONE LIST, READ BY BOTH THE ROADMAP AND THE SCREENS THEMSELVES. These
 * descriptions used to be typed into fourteen separate page files, which
 * is fourteen places for the same sentence to go stale. A screen becoming
 * real is now one edit here plus a real page — and if the entry is
 * removed and the page is not, the build stops rather than leaving a
 * "not built yet" notice on a screen that is.
 *
 * NOTHING IN HERE IS IN THE SIDEBAR. Fourteen menu rows wearing a "Soon"
 * label made a console of fifteen working screens read as a prototype,
 * and a menu should list what you can do rather than what is planned. The
 * plan lives on one page instead, and these stay reachable by URL.
 */

export interface PlannedScreen {
  /** The path under /admin. */
  slug: string;
  title: string;
  sub: string;
  /** What the screen will show once it is built. */
  will: string[];
  /** What has to exist in the product first. */
  needs: string[];
}

export const PLANNED_SCREENS: PlannedScreen[] = [
  {
    slug: "audit",
    title: "Audit Logs",
    sub: "Every action an admin took.",
    will: [
      "A permanent, unchangeable record of admin actions — refunds issued, states changed, roles granted — with who, what, when and from where.",
      "Filters by admin and by object, so “who refunded this order” is one search.",
      "Kept separately from Live Activity, which is the platform's own events rather than staff actions.",
    ],
    needs: [
      "Admin actions are partly recorded already. This needs one append-only table that nothing in the product can update or delete.",
    ],
  },
  {
    slug: "cms",
    title: "CMS",
    sub: "The words on the public site, without a deploy.",
    will: [
      "The marketing pages, the help articles and the legal pages, editable here.",
      "Who changed what, and the ability to put it back.",
    ],
    needs: [
      "Every public page is currently written in code, which means changing a sentence takes a deploy. Moving them here means a content store and a rendering path for it.",
    ],
  },
  {
    slug: "health",
    title: "System Health",
    sub: "Whether the things this depends on are working.",
    will: [
      "A live check of each dependency: the database, the payment provider, the email sender, the WhatsApp sender — configured or not, reachable or not.",
      "Whether the database schema is up to date with setup.sql, which is the single most common cause of a screen half-working.",
      "Recent errors, grouped, so a spike is visible without reading logs.",
    ],
    needs: [
      "Nothing new for the configuration and schema checks. Error grouping needs errors to be collected somewhere first.",
    ],
  },
  {
    slug: "integrations",
    title: "Integrations",
    sub: "The outside services this platform is wired to.",
    will: [
      "Each provider — payments, email, WhatsApp — with whether a key is set, which environment it belongs to, and when it was last used successfully.",
      "Switching a provider without a deploy, since payments and email already sit behind interfaces designed for exactly that.",
      "Webhook endpoints and their recent deliveries.",
    ],
    needs: [
      "Nothing new to show the state. Switching providers from here means keeping the choice in the database rather than in an environment variable.",
    ],
  },
  {
    slug: "live-events",
    title: "Live Events",
    sub: "What is happening right now.",
    will: [
      "Events whose doors are open at this moment, with tickets sold, people scanned in and the rate over the last hour.",
      "Anything going wrong during a live event — failed scans, payment errors at the door — surfaced while it can still be fixed.",
      "A one-tap route into that event's door screen.",
    ],
    needs: [
      "Nothing new — this is a filtered view of events and tickets. It needs a refresh loop so it stays live without a reload.",
    ],
  },
  {
    slug: "marketplace",
    title: "Marketplace",
    sub: "How Explore is curated.",
    will: [
      "Which events are surfaced on Explore and why, with the ability to feature and to hide.",
      "Reported listings, and anything auto-flagged before a person sees it.",
      "What Explore is actually converting: views to ticket sales, per city.",
    ],
    needs: [
      "Explore currently shows every published event with no editorial layer. Featuring needs a flag on events and a reason recorded against it.",
    ],
  },
  {
    slug: "notifications",
    title: "Notifications",
    sub: "Everything the platform sends, and whether it arrived.",
    will: [
      "Every message sent — ticket delivery, reminders, the WhatsApp roundup — with its state and its failure reason when it failed.",
      "The templates themselves, editable, with the approval state of each WhatsApp template.",
      "A resend, for the ticket that did not land.",
    ],
    needs: [
      "Email and WhatsApp both go out through provider interfaces already, but nothing records what was sent. That log is the missing piece.",
    ],
  },
  {
    slug: "promotions",
    title: "Promotions",
    sub: "Discount codes, early-bird windows and comps.",
    will: [
      "Every code in the platform, who created it, how many times it has been used and what it has cost in fees.",
      "Codes that look abused — one code, many cards, one device.",
      "Platform-wide promotions as well as an organiser's own.",
    ],
    needs: [
      "Discount codes do not exist in the product yet. Checkout has no field for one and no table stores them.",
    ],
  },
  {
    slug: "reports",
    title: "Reports",
    sub: "Numbers you can send to somebody else.",
    will: [
      "Scheduled exports — monthly fee income, payouts made, refunds issued — as files rather than screens.",
      "A per-organiser statement, which is what an organiser asks for at tax time.",
      "Anything on this console exportable as CSV from the screen you are looking at.",
    ],
    needs: [
      "An export path and a place to keep generated files. The underlying figures already exist.",
    ],
  },
  {
    slug: "support",
    title: "Support",
    sub: "Buyers and organisers who need a human.",
    will: [
      "An inbox of requests, each attached to the order, ticket or event it is about, so nobody has to ask for a reference.",
      "The actions support actually needs in one place: resend a ticket, refund, change an email, without leaving the thread.",
      "Who replied and when, so a request cannot quietly go unanswered.",
    ],
    needs: [
      "A support request store, and a route for buyers to raise one. Neither exists yet — today support happens in WhatsApp with no record.",
    ],
  },
  {
    slug: "transactions",
    title: "Transactions",
    sub: "Every movement of money through the platform, in one ledger.",
    will: [
      "One row per money movement — a charge, a split to an organiser, a refund, a payout — with its reference, its provider and the order it belongs to.",
      "A running platform balance per day, so a discrepancy shows up as a step rather than as a number nobody can explain.",
      "Filters by provider, by state, and by date, and an export for reconciling against a bank statement.",
    ],
    needs: [
      "A single ledger table. Today the movements live across orders, payouts and refunds and are only joinable by hand.",
    ],
  },
];

export function plannedScreen(slug: string): PlannedScreen | undefined {
  return PLANNED_SCREENS.find((s) => s.slug === slug);
}

/**
 * Screens that need no new data — only the view.
 *
 * Worth separating, because it is the difference between an afternoon
 * and a feature. Anything not listed here is waiting on a part of the
 * product that does not exist yet.
 */
export const READY_TO_BUILD = new Set([
  "live-events",
  "health",
  "integrations",
]);
