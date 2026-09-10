"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Ticket, Banknote,
  Eye, Share2, ExternalLink, Inbox, Loader2, Globe, Lock, ScanLine, Package, Pencil, Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/money";
import { buildDashboardShape, countdown } from "@/lib/dashboard-shape";
import { TicketTypeSplit, WeekdayBars } from "@/components/charts/bars";
import { PanelHead } from "@/components/charts/figures";
import { TONE_HEX, TONE_TRACK } from "@/lib/tones";
import { useOrigin } from "@/lib/use-origin";
import { publishItem, unpublishItem } from "@/app/actions/publish";
import { TicketTypesEditor } from "@/components/dashboard/ticket-types-editor";
import { MerchEditor } from "@/components/dashboard/merch-editor";
import { toast } from "sonner";

interface EventDetailViewProps {
  event: any;
  onBack: () => void;
  onChanged?: () => void;
}

interface EventTicketRow {
  status: string | null;
  ticket_type_name: string | null;
  price_kobo: number | string | null;
  checked_in_at: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  gross_kobo: number;
  quantity: number;
  status: string;
  payment_channel: string | null;
  paid_at: string | null;
  created_at: string;
}

export function EventDetailView({ event, onBack, onChanged }: EventDetailViewProps) {
  const [tab, setTab] = useState<"overview" | "tickets" | "merch" | "attendees">("overview");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tickets, setTickets] = useState<EventTicketRow[]>([]);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // useOrigin was imported but never called, so the share link below was
  // reading the bare global `origin`. In a browser that happens to be
  // window.origin, so it worked by accident; anywhere it renders on the
  // server it is a ReferenceError, and the page dies.
  const origin = useOrigin();

  const isPublished = event.publish_status === "published";

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, gross_kobo, quantity, status, payment_channel, paid_at, created_at")
        .eq("event_id", event.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false });

      if (error) throw error;
      setOrders((data ?? []) as OrderRow[]);

      // Admissions and tier limits, asked for separately and allowed to
      // come back empty: an event that sold before tickets were issued
      // still gets its money, its orders and its description.
      const [{ data: tix }, { data: tiers }] = await Promise.all([
        supabase
          .from("tickets")
          .select("status, ticket_type_name, price_kobo, checked_in_at, created_at")
          .eq("event_id", event.id),
        supabase
          .from("ticket_types")
          .select("quantity")
          .eq("event_id", event.id),
      ]);

      setTickets((tix ?? []) as EventTicketRow[]);

      // One unlimited tier makes the event unlimited. Adding up only the
      // limited ones would invent a ceiling that does not exist.
      const limits = tiers ?? [];
      const unlimited = limits.some((t) => t.quantity === null || t.quantity === undefined);
      const summed = limits.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
      setCapacity(
        !unlimited && summed > 0
          ? summed
          : event.capacity != null
            ? Number(event.capacity)
            : null
      );
    } catch (error) {
      console.error("Could not load orders:", error);
      setLoadError("Couldn't load attendees. Try again in a moment.");
    } finally {
      // Always resolves — never an indefinite spinner.
      setLoading(false);
    }
  }, [event.id, event.capacity]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Revenue is derived from real orders, never accumulated on the event row.
  const grossKobo = orders.reduce((sum, o) => sum + Number(o.gross_kobo || 0), 0);

  const liveTickets = tickets.filter(
    (t) => t.status !== "void" && t.status !== "refunded"
  );
  // Sold prefers issued tickets. The order quantity is the fallback for
  // an event whose sales predate ticket issuing.
  const sold =
    liveTickets.length > 0
      ? liveTickets.length
      : orders.reduce((sum, o) => sum + Number(o.quantity || 1), 0);
  const checkedIn = liveTickets.filter(
    (t) => t.status === "checked_in" || t.checked_in_at
  ).length;
  const attendees = sold;

  const pctSold = capacity && capacity > 0 ? Math.min(100, (sold / capacity) * 100) : null;
  const shape = buildDashboardShape(orders);

  /** What sold, by tier. Falls back to one line when there are no tiers. */
  const tierSplit = (() => {
    const totals = new Map<string, { tickets: number; grossKobo: number }>();
    for (const t of liveTickets) {
      const name = t.ticket_type_name?.trim() || "General admission";
      const row = totals.get(name) ?? { tickets: 0, grossKobo: 0 };
      row.tickets += 1;
      row.grossKobo += Number(t.price_kobo || 0);
      totals.set(name, row);
    }
    return Array.from(totals.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.tickets - a.tickets);
  })();

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const res = isPublished
        ? await unpublishItem("event", event.id)
        : await publishItem("event", event.id);

      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(isPublished ? "Event unpublished." : "Event is live.");
      onChanged?.();
      onBack();
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl =
    origin ? `${origin}/event/${event.id}` : "";

  return (
    /*
     * THE LAYOUT IS THE REFERENCE'S, THE SKIN IS OURS.
     *
     * This used to open with a 288px cover photo carrying white text and
     * four floating glass buttons over a black gradient — a poster, which
     * is the right shape for the page a BUYER sees and the wrong one for
     * the page an organiser works in. The reference puts the artwork in a
     * side rail and gives the whole width to the work: a title row, a row
     * of tabs, and a two-column body whose right-hand column holds the
     * facts that stay true whichever tab you are on.
     *
     * Nothing here is borrowed visually. The cards, buttons, fields and
     * tabs are the same classes the owner console uses, so this screen
     * gains a structure without inventing a fifth look for the product.
     */
    <div className="dl fixed inset-0 z-50 overflow-y-auto bg-[var(--dl-paper)] font-[family-name:var(--font-bricolage-grotesque)]">
      {/* ── Title row ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-[var(--dl-line)] bg-[var(--dl-panel)]">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
          <button
            onClick={onBack}
            aria-label="Back to events"
            className="dl-btn h-9 w-9 shrink-0 px-0"
          >
            <ArrowLeft className="h-[17px] w-[17px]" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold tracking-[-0.03em] md:text-[22px]">
            {event.title}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            {isPublished && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(shareUrl);
                  toast.success("Link copied");
                }}
                className="dl-btn hidden sm:inline-flex"
              >
                <Share2 className="h-[15px] w-[15px]" /> Copy link
              </button>
            )}
            <Link href={`/events/${event.id}/edit`} className="dl-btn">
              <Pencil className="h-[15px] w-[15px]" /> Edit
            </Link>
            <button
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`dl-btn ${isPublished ? "" : "dl-btn-primary"}`}
            >
              {publishing ? (
                <Loader2 className="h-[15px] w-[15px] animate-spin" />
              ) : isPublished ? (
                <Lock className="h-[15px] w-[15px]" />
              ) : (
                <Globe className="h-[15px] w-[15px]" />
              )}
              {isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 md:py-6">
        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="dl-tabs mb-5 w-fit max-w-full">
          {([
            { key: "overview", label: "Overview", icon: Eye },
            { key: "tickets", label: "Tickets", icon: Ticket },
            { key: "merch", label: "Merch", icon: Package },
            { key: "attendees", label: "Attendees", icon: Users },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={`dl-tab ${tab === t.key ? "dl-tab-on" : ""}`}
            >
              <t.icon className="h-[15px] w-[15px]" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body: work on the left, facts on the right ────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
        {tab === "overview" && (
          <div className="space-y-6">
            {/* One ruled block. Same as Overview, Events and everywhere else —
                no tinted icon chips, and the number does the talking. */}
            <div className="dl-card flex flex-wrap">
              {[
                { label: "Taken", value: formatKobo(grossKobo) },
                {
                  label: "Tickets sold",
                  value: capacity ? `${sold} / ${capacity}` : String(sold),
                },
                {
                  label: "Turned up",
                  value: sold > 0 ? `${checkedIn} / ${sold}` : "—",
                },
                { label: "Orders", value: String(orders.length) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="min-w-[152px] flex-1 border-l border-[var(--dl-line)] px-5 py-4 first:border-l-0"
                >
                  <p className="text-[27px] font-extrabold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
                    {m.value}
                  </p>
                  <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            {/* How full it is. The bar is the reason this tab exists —
                a percentage on its own doesn't tell you whether to
                promote, and the seats-left figure does. */}
            <div className="dl-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--dl-ink-faint)]">
                  How it is selling
                </p>
                {event.date && (
                  <p className="text-[13px] font-bold text-[var(--dl-ink-soft)]">
                    Doors {countdown(event.date)}
                  </p>
                )}
              </div>

              <div
                className="mt-3 h-3 w-full overflow-hidden rounded-[6px]"
                style={{ background: TONE_TRACK.neutral }}
              >
                <div
                  className="h-full rounded-[6px]"
                  style={{
                    width:
                      pctSold === null
                        ? sold > 0 ? "100%" : "0%"
                        : `${Math.max(pctSold > 0 ? 2 : 0, pctSold)}%`,
                    background:
                      pctSold === null
                        ? TONE_HEX.count
                        : pctSold >= 100
                          ? TONE_HEX.money
                          : pctSold >= 90
                            ? TONE_HEX.fee
                            : TONE_HEX.count,
                    opacity: pctSold === null ? 0.25 : 1,
                  }}
                />
              </div>

              <p className="mt-2 text-[13.5px] text-[var(--dl-ink-soft)]">
                {pctSold === null ? (
                  sold > 0 ? (
                    <>
                      <strong className="text-[var(--dl-ink)]">{sold}</strong> sold. No
                      limit set — add one on the Tickets tab if the room has a capacity.
                    </>
                  ) : (
                    "Nothing sold yet."
                  )
                ) : sold >= capacity! ? (
                  <strong className="text-[var(--dl-ink)]">Sold out.</strong>
                ) : (
                  <>
                    <strong className="text-[var(--dl-ink)]">{Math.round(pctSold)}%</strong>{" "}
                    sold — {(capacity! - sold).toLocaleString("en-NG")} still available.
                  </>
                )}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="dl-card overflow-hidden">
                <PanelHead title="Which ticket sells" tone="money" />
                <TicketTypeSplit data={tierSplit} />
              </div>

              <div className="dl-card overflow-hidden">
                <PanelHead title="When people buy" tone="count" />
                <WeekdayBars data={shape.byWeekday} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <div className="dl-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-[var(--dl-ink)]">About this event</h3>
                <p className="text-sm leading-relaxed text-[var(--dl-ink-soft)]">
                  {event.description || "No description added yet."}
                </p>
              </div>

              <div className="dl-card space-y-1 p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--dl-ink-faint)]">Location</p>
                <p className="text-sm font-medium text-[var(--dl-ink)]">{event.location || "Online"}</p>
                {event.map_link && (
                  <a
                    href={event.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--dl-ink)] hover:underline"
                  >
                    Open map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {!isPublished && (
                  <p className="mt-4 border-t border-[var(--dl-line)] pt-4 text-xs text-[var(--dl-ink-faint)]">
                    This event is a draft. Publish it to get a shareable link.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "merch" && (
          <div className="dl-card bg-[var(--dl-panel)]/40 p-5">
            <MerchEditor eventId={event.id} />
          </div>
        )}

        {tab === "tickets" && (
          <div className="dl-card p-6">
            <TicketTypesEditor eventId={event.id} />
          </div>
        )}

        {tab === "attendees" && (
          <div className="dl-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
              </div>
            ) : loadError ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-[var(--dl-ink-soft)]">{loadError}</p>
                <button
                  onClick={fetchOrders}
                  className="dl-card mt-4 bg-[var(--dl-panel)]/50 px-4 py-2 text-xs font-medium text-[var(--dl-ink-soft)] hover:bg-[var(--dl-paper)]"
                >
                  Retry
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--dl-panel)] text-[var(--dl-ink-faint)]">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[var(--dl-ink)]">No attendees yet</p>
                <p className="mt-1 text-xs text-[var(--dl-ink-faint)]">
                  {isPublished
                    ? "Share your event link to start getting sign-ups."
                    : "Publish this event to start getting sign-ups."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--dl-ink)] text-xs font-bold text-white">
                      {(o.buyer_name || o.buyer_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--dl-ink)]">
                        {o.buyer_name || o.buyer_email}
                      </p>
                      <p className="truncate text-xs text-[var(--dl-ink-faint)]">{o.buyer_email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-[var(--mint)]">
                        {Number(o.gross_kobo) === 0 ? "Free" : formatKobo(Number(o.gross_kobo))}
                      </p>
                      <p className="text-[10px] text-[var(--dl-ink-faint)]">
                        {o.paid_at ? new Date(o.paid_at).toLocaleDateString("en-NG") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </div>

          {/* ── The rail ───────────────────────────────────────────
              THE FACTS THAT DO NOT CHANGE WITH THE TAB. Whichever
              screen you are on, "when is it, where is it, is it live"
              are the questions you are answering against — so they stop
              being a banner you scroll past and become a column that
              stays. It is sticky above xl and simply the last block on a
              narrow window, where a pinned rail would eat the page. */}
          <aside className="min-w-0 xl:sticky xl:top-[76px] xl:h-fit">
            <div className="dl-card overflow-hidden">
              <div className="relative aspect-[16/10] w-full bg-[#ECEEF0]">
                {event.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--dl-ink-faint)]">
                    <CalendarIcon className="h-10 w-10 opacity-30" />
                  </div>
                )}
                <span
                  className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isPublished
                      ? "bg-[var(--dl-acid)] text-[var(--dl-ink)]"
                      : "bg-[var(--dl-ink)] text-white"
                  }`}
                >
                  {isPublished ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {isPublished ? "Live" : "Draft"}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <p className="flex items-start gap-2.5 text-[13.5px] font-semibold">
                  <CalendarIcon className="mt-[2px] h-[15px] w-[15px] shrink-0 text-[var(--dl-ink-faint)]" />
                  <span>
                    {event.date
                      ? new Date(event.date).toLocaleDateString("en-NG", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric",
                        })
                      : "Date to be announced"}
                    {event.time ? ` · ${event.time}` : ""}
                  </span>
                </p>
                <p className="flex items-start gap-2.5 text-[13.5px] font-semibold">
                  <MapPin className="mt-[2px] h-[15px] w-[15px] shrink-0 text-[var(--dl-ink-faint)]" />
                  <span className="min-w-0">{event.location || "Online"}</span>
                </p>
              </div>

              <div className="space-y-2 border-t border-[var(--dl-line)] p-4">
                {isPublished ? (
                  <>
                    <Link href={`/events/${event.id}/door`} className="dl-btn w-full">
                      <ScanLine className="h-[15px] w-[15px]" /> Scan tickets
                    </Link>
                    <Link href={`/events/${event.id}/message`} className="dl-btn w-full">
                      <Megaphone className="h-[15px] w-[15px]" /> Message guests
                    </Link>
                    <a
                      href={shareUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dl-btn w-full"
                    >
                      <ExternalLink className="h-[15px] w-[15px]" /> View public page
                    </a>
                  </>
                ) : (
                  /* NOT DISABLED BUTTONS. A draft has no public page to
                     open and no door to scan at, and four greyed-out
                     controls is a worse answer than one sentence saying
                     why. */
                  <p className="text-[13px] leading-relaxed text-[var(--dl-ink-soft)]">
                    Scanning, messaging and the public link all switch on the
                    moment you publish.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
