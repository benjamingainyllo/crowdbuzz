"use client";

import { useEffect, useState, useTransition } from "react";
import { getEventById, type PublicCohost, type PublicProduct, type PublicTicketType } from "@/app/actions/events";
import { titleStyleCssClamp } from "@/lib/title-styles";
import { MerchPicker, type Basket } from "@/components/storefront/merch-picker";
import { createCheckoutSession } from "@/app/actions/checkout";
import { getInterest } from "@/app/actions/interest";
import { Logo } from "@/components/brand/logo";
import { Poster, schemeFor } from "@/components/storefront/poster";
import { coloursFromImage } from "@/lib/image-colour";
import { themeFromColours, themeVars, type PageTheme } from "@/lib/page-theme";
import { SAMPLE_EVENT_ID } from "@/lib/sample-event";
import { ReactionBar } from "@/components/storefront/reaction-bar";
import { EventFeed } from "@/components/storefront/event-feed";
import { InterestButton } from "@/components/storefront/interest-button";
import { getDeliveryChannels } from "@/app/actions/delivery";
import { bandFeeKobo, formatKobo } from "@/lib/money";
import { formatE164, toE164 } from "@/lib/whatsapp/phone";
import { Loader2, MapPin, ExternalLink, CheckCircle2, Minus, Plus } from "lucide-react";

export function EventCheckoutPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [host, setHost] = useState<any>(null);
  /* The flyer's own theme, once its pixels have been read. Null until
     then, and for any event without a cover. */
  const [pageTheme, setPageTheme] = useState<PageTheme | null>(null);
  const [cohosts, setCohosts] = useState<PublicCohost[]>([]);
  const [ticketTypes, setTicketTypes] = useState<PublicTicketType[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  /** productId -> what the buyer picked. Absent means not in the basket. */
  const [basket, setBasket] = useState<Basket>({});
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  /* Unticked by default, and it stays that way unless somebody chooses
     otherwise. A pre-ticked consent box is not consent, and WhatsApp
     bans numbers that message people who never agreed — the same number
     that delivers every ticket. */
  const [optIn, setOptIn] = useState(false);
  /** WhatsApp only leads once it can actually send. */
  const [whatsappLive, setWhatsappLive] = useState(false);
  const [emailLive, setEmailLive] = useState(false);
  /** Kept so the buyer can open their ticket straight away. */
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [registered, setRegistered] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  /** Null until the save state is known, so the star never renders a lie. */
  const [interest, setInterest] = useState<{ count: number; saved: boolean } | null>(null);

  useEffect(() => {
    getInterest(params.id)
      .then(setInterest)
      .catch(() => {});
  }, [params.id]);

  /* THE PAGE TAKES ITS COLOUR FROM THE FLYER. Runs once the event is
     loaded and only when there is a cover to read; a failure leaves the
     hashed pair in place, which is what the page looked like before this
     existed. See lib/image-colour.ts for why it can fail and why that is
     acceptable. */
  useEffect(() => {
    const url = event?.cover_image_url;
    if (!url) {
      setPageTheme(null);
      return;
    }
    let alive = true;
    coloursFromImage(url).then((pair) => {
      if (alive && pair) setPageTheme(themeFromColours(pair));
    });
    return () => {
      alive = false;
    };
  }, [event?.cover_image_url]);

  /* The page element covers the viewport, but the document behind it does
     not — so overscrolling on a phone, or a short page on a tall screen,
     shows the .sf scope's standing near-black underneath a page that is
     now olive or orange. Paint the document to match, and put it back on
     the way out so the next page is not left wearing this one's colour. */
  useEffect(() => {
    if (!pageTheme) return;
    const prevBody = document.body.style.background;
    const prevHtml = document.documentElement.style.background;
    document.body.style.background = pageTheme.bgTo;
    document.documentElement.style.background = pageTheme.bgTo;
    return () => {
      document.body.style.background = prevBody;
      document.documentElement.style.background = prevHtml;
    };
  }, [pageTheme]);

  useEffect(() => {
    getDeliveryChannels()
      .then((c) => {
        setWhatsappLive(c.whatsapp);
        setEmailLive(c.email);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        const res = await getEventById(params.id);
        if (!active) return;
        if (res.success && res.event) {
          setEvent(res.event);
          setHost(res.host ?? null);
          setCohosts(res.cohosts ?? []);
          setTicketTypes(res.ticketTypes ?? []);
          setProducts(res.products ?? []);
          // Preselect the first tier a buyer can actually buy, so a
          // single-tier event needs no choosing at all.
          const firstAvailable = (res.ticketTypes ?? []).find((t) => t.available);
          setSelectedTierId(firstAvailable?.id ?? null);
        }
      } finally {
        // Always resolve loading, even when the query fails, so the page
        // never sits on an indefinite spinner.
        if (active) setLoading(false);
      }
    }

    loadEvent();
    return () => {
      active = false;
    };
  }, [params.id]);

  const selectedTier = ticketTypes.find((t) => t.id === selectedTierId) ?? null;
  const priceKobo = selectedTier?.priceKobo ?? Number(event?.price_kobo ?? 0);
  const isFree = priceKobo === 0;
  const subtotalKobo = priceKobo * quantity;

  // Some organisers add our fee to the buyer's total rather than absorbing
  // it. When they do, it is shown as its own line here — a fee the buyer
  // only discovers on the payment screen is the reason people abandon
  // checkouts, and it would be the organiser who paid for that.
  const passFee = Boolean(event?.pass_fee_to_buyer) && !isFree;
  const feeKobo = passFee ? bandFeeKobo(priceKobo) * quantity : 0;

  const merchKobo = products.reduce((sum, p) => {
    const picked = basket[p.id];
    return picked ? sum + p.priceKobo * picked.quantity : sum;
  }, 0);

  const totalKobo = subtotalKobo + feeKobo + merchKobo;

  // A free ticket with a paid shirt is still a paid order.
  const payingSomething = totalKobo > 0;

  // The most this tier will sell in one go: its own per-order cap, and
  // never more than it has left.
  const maxQuantity = selectedTier
    ? Math.max(
        1,
        Math.min(
          selectedTier.maxPerOrder,
          selectedTier.remaining ?? selectedTier.maxPerOrder
        )
      )
    : 1;

  const nothingOnSale = ticketTypes.length === 0 || !ticketTypes.some((t) => t.available);

  // The showroom event exists to be looked at, not bought. Checkout would
  // fail on it anyway — there is no such row — so it fails politely instead.
  const isPreview = params.id === SAMPLE_EVENT_ID;

  // The page wears the same two colours its poster is painted in.
  /* The hashed pair is the floor, not the answer. When the event has a
     cover, its real colours replace it as soon as they are read — see the
     effect below. An event with no cover keeps the hash, which is what
     paints the generated poster too, so the page and the poster still
     agree. */
  const scheme = schemeFor(params.id);
  const goingCount = Number(event?.attendees_count ?? 0);

  // Clamp if the buyer picks a smaller tier after choosing a big quantity.
  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQuantity));
  }, [maxQuantity]);

  /** Normalised now, so a typo is caught before money moves, not after. */
  const phoneE164 = toE164(phone);
  const deliveryLine = whatsappLive
    ? "on WhatsApp, and by email as a backup"
    : "by email";

  const handleCheckout = () => {
    // A typo is only worth blocking on when WhatsApp is the thing
    // delivering. Until then a bad number costs nothing.
    if (whatsappLive && !phoneE164) {
      setCheckoutError("Check the WhatsApp number — that doesn't look right.");
      return;
    }
    if (phone && !phoneE164) {
      setCheckoutError("That WhatsApp number doesn't look right.");
      return;
    }
    if (!email) {
      setCheckoutError("Please enter your email.");
      return;
    }
    setCheckoutError(null);

    startTransition(async () => {
      const res = await createCheckoutSession({
        itemType: "event",
        itemId: event.id,
        buyerEmail: email,
        buyerName: name || undefined,
        buyerPhone: phoneE164 ?? undefined,
        marketingOptIn: optIn && !!phoneE164,
        ticketTypeId: selectedTierId ?? undefined,
        quantity,
        products: Object.entries(basket)
          .filter(([, picked]) => picked.quantity > 0)
          .map(([productId, picked]) => ({
            productId,
            variant: picked.variant,
            quantity: picked.quantity,
          })),
      });

      if (res.success && res.completedWithoutPayment) {
        setReference(res.reference ?? null);
        setRegistered(true);
      } else if (res.success && res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        setCheckoutError(res.error || "Something went wrong.");
      }
    });
  };

  /* ── Daylight, in the shape of an invitation ─────────────────────
     The title is the biggest thing on the page and the flyer sits beside
     it, because this is what a promoter shares into a group chat and what
     a buyer decides from. What it replaces was a 448px dark card with the
     title at 24px and the artwork squashed into a 176px strip on top.
     ─────────────────────────────────────────────────────────────── */
  const panel = "rounded-2xl border border-[var(--dl-line)] bg-[var(--dl-panel)]";
  const label = "text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]";
  const field =
    "w-full rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3.5 text-[15.5px] outline-none transition-colors placeholder:text-[var(--dl-ink-faint)] focus:border-[var(--coral)]";

  if (loading) {
    return (
      <div className="sf flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--dl-ink-faint)]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="sf flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center font-[family-name:var(--font-bricolage-grotesque)]">
        <p className="text-[24px] font-extrabold tracking-[-0.03em]">Event not found</p>
        <p className="text-[15px] text-[var(--dl-ink-soft)]">
          This event may have been removed, or it isn&apos;t published yet.
        </p>
      </div>
    );
  }

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-NG", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date to be announced";

  // The flyer name wins over the account name when one is set. An
  // organiser throws parties as "Benjitech" and banks as Benjamin — the
  // payout still uses the verified account name, so this can only change
  // what the poster says, never where the money lands.
  const hostName =
    (event.host_nickname ?? "").trim() ||
    [host?.first_name, host?.last_name].filter(Boolean).join(" ") ||
    host?.handle ||
    null;

  return (
    <div
      /* overflow-x-hidden because the drifting glow layers are scaled past
         the viewport. They are position:fixed so they cannot extend the
         scroll area, but a phone that ever finds a horizontal scroll on a
         checkout page is a phone that loses the sale. */
      className="sf min-h-screen overflow-x-hidden font-[family-name:var(--font-bricolage-grotesque)]"
      /* When the cover has been read, its theme replaces the .sf scope's
         own tokens — background, ink, panels, hairlines, all of it — so
         every component already written against --dl-ink follows the page
         without knowing any of this exists. Until then, and for an event
         with no cover, the hashed pair paints the glow over the standing
         dark scope exactly as before. */
      style={
        (pageTheme
          ? themeVars(pageTheme)
          : { "--ev-from": scheme.from, "--ev-to": scheme.to }) as React.CSSProperties
      }
    >
      {/* The drifting fields exist to give a flat dark page some life.
          Once the page carries the flyer's own gradient they are no longer
          doing that job — they are muddying it — so they step back rather
          than stack on top. */}
      <div className={`sf-glow ${pageTheme ? "opacity-[0.18]" : ""}`} aria-hidden="true" />
      <div className={`sf-glow-2 ${pageTheme ? "opacity-[0.14]" : ""}`} aria-hidden="true" />
      {/* max-w-6xl left a third of a wide screen empty on either side —
          the page read as a narrow column floating in the dark. Wider,
          with the padding growing as the screen does so it never runs
          edge to edge either. */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-16 xl:px-16">
        <a href="/" className="mb-10 inline-flex h-11 items-center" aria-label="CrowdBuzz">
          <Logo height={28} />
        </a>

        {isPreview && (
          <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--dl-line)] border-l-[6px] border-l-[var(--coral)] bg-[var(--dl-panel)] px-4 py-3">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--coral)]">Preview</span>
            <span className="text-[14px] font-semibold">
              A made-up event, so you can see the page. Nothing here is on sale.
            </span>
          </div>
        )}

        {/* grid-cols-[minmax(0,1fr)] AT EVERY WIDTH, not just lg.
            A grid item defaults to min-width:auto, so a single implicit
            column refuses to shrink below its content's minimum — one
            wide child inside then pushes the whole page past the
            viewport. The desktop rule already guarded against this and
            the mobile one did not, which is exactly why the phone layout
            ran off the right edge. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
          {/* ── What it is ─────────────────────────────────────
              THE LEFT SIDE HOLDS, THE RIGHT SIDE MOVES. What the night is
              stays on screen while you scroll the tiers, the merch and the
              form — so you never lose sight of what you are buying a ticket
              to. self-start is what makes sticky work inside a grid: without
              it the item stretches to the row's full height and there is
              nothing left to stick.

              STICKY ALONE WAS NOT ENOUGH, and that is why it looked broken:
              this column is taller than the viewport, and an element taller
              than the screen has nothing left to pin — it scrolls with the
              page until its bottom arrives, so both sides moved together.
              Giving it the viewport's height and its own overflow makes it a
              panel that genuinely holds while the buying column scrolls past
              it. Anything below the fold inside it scrolls within the panel.

              Only above lg. On a phone there is one column and sticky would
              pin the title over the thing you are trying to read. */}
          <div className="min-w-0 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-3 [scrollbar-width:thin]">
            {/* One element. The clamp carries the face's own scale at both
                ends, so a script shrinks from its larger size rather than
                from everyone else's. */}
            {/* FULL BLEED ON A PHONE. This wore the same 20px gutter as the
                text and sat in a rounded card with dark bands down either
                side — which is the single thing that made the page read as a
                web page next to an app. Padding around words is right;
                padding around a hero image is not. Negative margins cancel
                the container's own padding at each breakpoint, and the
                corners and border only appear once there is a column for the
                card to be a card in.

                mt-[-8px] pulls it up under the logo so the image starts at
                the top of the scroll rather than after a strip of ground. */}
            <div
              className={`sf-rise -mx-5 -mt-2 mb-7 aspect-[4/5] w-[calc(100%+2.5rem)] overflow-hidden border-[var(--dl-line)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] sm:-mx-8 sm:w-[calc(100%+4rem)] sm:rounded-2xl sm:border lg:hidden`}
              style={{ containerType: "inline-size" }}
            >
              {event.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
              ) : (
                <Poster seed={event.id} title={event.title} caption={formattedDate} />
              )}
            </div>

            <h1
              className="break-words"
              style={titleStyleCssClamp(event.title_style, 40, 56)}
            >
              {event.title}
            </h1>

            <p className="mt-6 text-[19px] font-bold leading-[1.35] sm:text-[22px]">
              {formattedDate}
              {event.time ? (
                <>
                  <br />
                  <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic tracking-[-0.01em]">
                    Doors {event.time}
                  </span>
                </>
              ) : null}
            </p>

            {hostName && (
              <div className="mt-8 flex items-center gap-3">
                {host?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={host.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-xl border border-[var(--dl-line)] object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] text-[14px] font-extrabold">
                    {hostName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className={label}>Hosted by</p>
                  {host?.handle ? (
                    <a href={`/${host.handle}`} className="text-[15px] font-extrabold hover:underline">
                      {hostName}
                    </a>
                  ) : (
                    <p className="text-[15px] font-extrabold">{hostName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Saving is deliberately separate from buying: plenty of
                people decide they want to go weeks before they decide to
                pay, and until now the page had nowhere for that to land.
                Rendered only once the real state is known — a star that
                starts empty and fills a moment later reads as the page
                undoing the visitor's tap. */}
            {interest && (
              <div className="mt-6 flex">
                <InterestButton
                  eventId={params.id}
                  initialSaved={interest.saved}
                  initialCount={interest.count}
                  variant="full"
                />
              </div>
            )}

            {cohosts.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className={label}>With</p>
                {cohosts.map((c) =>
                  c.handle ? (
                    <a
                      key={c.id}
                      href={`/${c.handle}`}
                      className="rounded-full border border-[var(--dl-line)] px-3 py-1 text-[13.5px] font-extrabold hover:-translate-y-[1px]"
                    >
                      {c.name}
                    </a>
                  ) : (
                    <span
                      key={c.id}
                      className="rounded-full border border-[var(--dl-line)] px-3 py-1 text-[13.5px] font-extrabold"
                    >
                      {c.name}
                    </span>
                  )
                )}
              </div>
            )}

            <div className="mt-8 flex items-start gap-3">
              <MapPin className="mt-[3px] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold">{event.location || "Online"}</p>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13.5px] font-bold underline underline-offset-2"
                  >
                    Open the map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* THE HOST'S OWN WORDS, AS A MESSAGE — not a paragraph of body
                copy. An invitation reads like a letter from an institution;
                a flyer dropped in a group chat reads like a person talking,
                and the second one is what actually gets people out of the
                house. Same text, different frame: a bubble with a tail, a
                name above it, and nothing else pretending to be typography. */}
            {event.description && (
              <div className="mt-8 max-w-[52ch]">
                {hostName && (
                  <p className="mb-2 pl-1 text-[12.5px] font-extrabold tracking-[0.01em] text-[var(--dl-ink-faint)]">
                    {hostName}
                  </p>
                )}
                <div className="relative rounded-[20px] rounded-bl-[6px] border border-[var(--dl-line)] bg-[var(--dl-panel)] px-5 py-4">
                  <p className="whitespace-pre-line text-[16px] leading-[1.6] text-[var(--dl-ink)]">
                    {event.description}
                  </p>
                </div>
              </div>
            )}

            {/* One tap, no account, no email. The cheapest true social proof
                on the page — and the thing that makes it a room rather than
                a notice board. */}
            <div className="mt-7">
              <ReactionBar eventId={event.id} />
            </div>

            {/* Read by anyone, written by ticket holders. Renders nothing at
                all when there is neither a conversation to show nor a right
                to start one — an empty box is not a feature. */}
            <EventFeed eventId={event.id} />

            {/* An invitation's job is to say other people are coming. This was
                a grey 15px line with an icon; it is the second-loudest thing
                on the page now, and it says something true when the number is
                zero rather than printing a dispiriting "0". */}
            <div className="mt-10 border-t border-[var(--dl-line)] pt-7">
              <div className="flex items-baseline gap-3">
                <span className="text-[44px] font-extrabold leading-none tracking-[-0.045em] sm:text-[54px]">
                  {goingCount}
                </span>
                <span className="text-[17px] font-bold text-[var(--dl-ink-soft)]">
                  {goingCount === 1 ? "person is going" : "people are going"}
                </span>
              </div>
              <p className="mt-2.5 text-[14.5px] text-[var(--dl-ink-faint)]">
                {goingCount === 0
                  ? "Nobody yet. Somebody has to be first — it may as well be you."
                  : interest && interest.count > 0
                    ? `${interest.count} more ${interest.count === 1 ? "person has" : "people have"} saved it.`
                    : "Tap the star above to keep it, and decide later."}
              </p>
            </div>
          </div>

          {/* ── The flyer, and getting in ─────────────────────
              order-first on a phone: a flyer arrives picture-first, and
              scrolling past six lines of admin to reach the artwork is how
              a listing behaves, not an invitation. */}
          <div className="min-w-0">
            <div
              className={`${panel} hidden aspect-[4/5] w-full overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] lg:block`}
              style={{ containerType: "inline-size" }}
            >
              {event.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Poster seed={event.id} title={event.title} caption={formattedDate} />
              )}
            </div>

            {registered ? (
              <div className={`${panel} mt-5 p-6 text-center`}>
                <CheckCircle2 className="mx-auto h-8 w-8" strokeWidth={2} />
                <p className="mt-3 text-[18px] font-extrabold tracking-[-0.02em]">You&apos;re in</p>

                {/*
                  The ticket first, the message second. This used to say "we
                  sent your ticket to <email>" and nothing else, which is a
                  promise about someone else's mail server — and a flat lie
                  whenever no email service is configured, which is exactly
                  the state a new install is in. The link always works.
                */}
                {reference && (
                  <a
                    href={`/tickets/${reference}`}
                    className="mt-4 block rounded-xl border border-[var(--dl-line)] bg-[var(--dl-ink)] py-3 text-[14px] font-extrabold text-[var(--dl-paper)]"
                  >
                    {quantity > 1 ? `Open your ${quantity} tickets` : "Open your ticket"}
                  </a>
                )}

                <p className="mt-3 text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                  {emailLive
                    ? `A copy is on its way to ${email}.`
                    : "Screenshot this or keep the link — it's your way in."}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {nothingOnSale ? (
                  <div className={`${panel} p-5 text-center`}>
                    <p className="text-[15px] font-extrabold">Nothing on sale right now</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                      {ticketTypes.some((t) => t.soldOut)
                        ? "Every ticket for this event has gone."
                        : "The organiser hasn't opened sales yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Only worth choosing between when there's a choice. */}
                    {ticketTypes.length > 1 && (
                      <div className="space-y-2">
                        <p className={label}>Ticket</p>
                        {ticketTypes.map((tier) => {
                          const selected = tier.id === selectedTierId;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              disabled={!tier.available}
                              onClick={() => setSelectedTierId(tier.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                                selected
                                  ? "border-[var(--dl-line)] bg-[var(--dl-ink)] text-[var(--dl-paper)]"
                                  : "border-[var(--dl-line)] bg-[var(--dl-panel)]"
                              } ${tier.available ? "" : "cursor-not-allowed opacity-45"}`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[14.5px] font-extrabold">
                                  {tier.name}
                                </span>
                                {tier.description && (
                                  <span
                                    className={`mt-0.5 block truncate text-[12.5px] ${
                                      selected ? "opacity-75" : "text-[var(--dl-ink-soft)]"
                                    }`}
                                  >
                                    {tier.description}
                                  </span>
                                )}
                                {tier.soldOut ? (
                                  <span className="mt-1 block text-[12px] font-extrabold uppercase tracking-[0.1em]">
                                    Sold out
                                  </span>
                                ) : tier.notYetOpen ? (
                                  <span className="mt-1 block text-[12px]">Not on sale yet</span>
                                ) : tier.closed ? (
                                  <span className="mt-1 block text-[12px]">Sales closed</span>
                                ) : tier.remaining !== null && tier.remaining <= 10 ? (
                                  <span className="mt-1 block text-[12px] font-extrabold uppercase tracking-[0.1em]">
                                    Only {tier.remaining} left
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 text-[14.5px] font-extrabold [font-variant-numeric:tabular-nums]">
                                {tier.priceKobo === 0 ? "Free" : formatKobo(tier.priceKobo)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {maxQuantity > 1 && (
                      <div>
                        <p className={label}>How many</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            aria-label="One fewer"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[3ch] text-center text-[19px] font-extrabold [font-variant-numeric:tabular-nums]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="One more"
                            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                            disabled={quantity >= maxQuantity}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          {quantity >= maxQuantity && (
                            <span className="text-[12.5px] text-[var(--dl-ink-soft)]">
                              {selectedTier?.remaining === maxQuantity
                                ? "That's all that's left"
                                : `Max ${maxQuantity} per order`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <MerchPicker products={products} basket={basket} onChange={setBasket} />

                <div>
                  <label htmlFor="name" className={label}>Your name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chidi Okonkwo"
                    className={`${field} mt-2`}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={label}>
                    {whatsappLive ? "WhatsApp number" : "WhatsApp number (optional)"}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className={`${field} mt-2`}
                    required={whatsappLive}
                  />
                  {/* Read the number back. WhatsApp fails silently on a
                      malformed number, so the only safe moment to catch a
                      typo is before paying, while somebody is looking. */}
                  <p className="mt-1.5 text-[12px] text-[var(--dl-ink-soft)]">
                    {whatsappLive
                      ? phoneE164
                        ? `Your ticket goes to ${formatE164(phoneE164)} on WhatsApp.`
                        : "Your ticket arrives here on WhatsApp, the moment you pay."
                      : "WhatsApp tickets are coming. Leave your number and you'll get one there too."}
                  </p>

                  {/* THE OPT-IN. Asked plainly, in the organiser's name, at
                      the one moment somebody actually wants to hear from
                      them again. Hidden until there is a number to send to,
                      because a consent box for a channel you have not given
                      us is just noise in a checkout. */}
                  {phoneE164 && (
                    <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] p-3">
                      <input
                        type="checkbox"
                        checked={optIn}
                        onChange={(e) => setOptIn(e.target.checked)}
                        className="mt-0.5 h-4 w-4 flex-none accent-[var(--coral)]"
                      />
                      <span className="text-[13px] leading-[1.45] text-[var(--dl-ink-soft)]">
                        Tell me when{" "}
                        <span className="font-bold text-[var(--dl-ink)]">
                          {hostName || "this organiser"}
                        </span>{" "}
                        has another event. On WhatsApp, from them — not from
                        CrowdBuzz. Stop any time.
                      </span>
                    </label>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className={label}>
                    {whatsappLive ? "Email (backup copy)" : "Email"}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${field} mt-2`}
                    required={whatsappLive}
                  />
                </div>

                {(feeKobo > 0 || merchKobo > 0) && (
                  <div className={`${panel} space-y-1.5 px-4 py-3 text-[13.5px]`}>
                    <div className="flex justify-between text-[var(--dl-ink-soft)]">
                      <span>{quantity > 1 ? `${quantity} tickets` : "Ticket"}</span>
                      <span className="[font-variant-numeric:tabular-nums]">
                        {subtotalKobo === 0 ? "Free" : formatKobo(subtotalKobo)}
                      </span>
                    </div>

                    {products.map((product) => {
                      const picked = basket[product.id];
                      if (!picked) return null;
                      return (
                        <div key={product.id} className="flex justify-between text-[var(--dl-ink-soft)]">
                          <span className="truncate pr-3">
                            {picked.quantity > 1 ? `${picked.quantity} × ` : ""}
                            {product.name}
                            {picked.variant ? ` (${picked.variant})` : ""}
                          </span>
                          <span className="shrink-0 [font-variant-numeric:tabular-nums]">
                            {formatKobo(product.priceKobo * picked.quantity)}
                          </span>
                        </div>
                      );
                    })}

                    {feeKobo > 0 && (
                      <div className="flex justify-between text-[var(--dl-ink-soft)]">
                        <span>Booking fee</span>
                        <span className="[font-variant-numeric:tabular-nums]">{formatKobo(feeKobo)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-[var(--dl-line)] pt-1.5 font-extrabold">
                      <span>Total</span>
                      <span className="[font-variant-numeric:tabular-nums]">{formatKobo(totalKobo)}</span>
                    </div>
                  </div>
                )}

                {checkoutError && (
                  <p className="text-[13px] font-bold text-[var(--dl-danger)]">{checkoutError}</p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={isPending || nothingOnSale || isPreview}
                  className="flex w-full items-center justify-center rounded-xl border border-[var(--dl-line)] bg-[var(--coral)] py-4 text-[16px] font-extrabold text-white transition-transform hover:-translate-y-[1px] disabled:opacity-60"
                >
                  {isPreview ? (
                    "Preview — nothing to buy"
                  ) : isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing…
                    </>
                  ) : nothingOnSale ? (
                    "Sold out"
                  ) : !payingSomething ? (
                    quantity > 1 ? `Get ${quantity} tickets — free` : "Count me in — it's free"
                  ) : (
                    `Pay ${formatKobo(totalKobo)}`
                  )}
                </button>

                <p className="text-center text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
                  {isFree
                    ? `No account needed. Your ticket arrives ${deliveryLine}.`
                    : `No account needed. Card or bank transfer. Your ticket arrives ${deliveryLine}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
