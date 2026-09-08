/**
 * The marketing site's links.
 *
 * Kept in a plain module rather than beside the nav component, because the
 * nav is a client component: anything exported from there becomes a client
 * reference, and a server-rendered page (the footer, /features, /pricing)
 * can't map over one.
 */
export const MARKETING_NAV = [
  ["/explore", "Explore"],
  ["/pricing", "Pricing"],
  ["/features", "Features"],
  ["/help", "Help"],
] as const;

/*
 * Why this order, and why Event types left.
 *
 * Three of the previous four items were aimed at somebody already
 * convinced. Price is the first question anybody asks about a ticketing
 * platform and the one we win on, so it comes before the feature list.
 * Help earns a top-level slot because the reader who needs it is
 * frightened about money, and a person who cannot find that answer does
 * not sign up and does not tell you why.
 *
 * Event types is still a page and still linked from the footer — it is a
 * supporting argument, not one of the four things worth a menu slot.
 */

/**
 * The footer's columns.
 *
 * ONLY LINKS TO PAGES THAT EXIST. The layout this follows has columns for
 * About, Press, Careers, a help centre, an iOS app and five social accounts.
 * We have none of those, and a footer full of dead links reads worse than a
 * short one that works.
 *
 * When a page or an account does exist, add it here and the column appears.
 * Obvious candidates, none of which are ready:
 *   Company  — About, Careers, Blog
 *   Support  — Contact, Help centre
 *   Socials  — Instagram, TikTok, X
 */
export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      ["/explore", "Explore events"],
      ["/features", "Features"],
      ["/pricing", "Pricing"],
      ["/sell", "What you'd keep"],
      ["/vs-tix", "Compared to Tix"],
      ["/event-types", "Event types"],
    ],
  },
  {
    title: "Organisers",
    links: [
      ["/help", "How it works"],
      ["/login", "Sign in"],
      ["/login", "Create an account"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["/terms", "Terms of service"],
      ["/privacy", "Privacy policy"],
      ["/cookies", "Cookie policy"],
    ],
  },
] as const;
