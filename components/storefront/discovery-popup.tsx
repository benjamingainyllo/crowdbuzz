"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X, Loader2, Check } from "lucide-react";
import { subscribeToDiscovery } from "@/app/actions/discovery";
import { popularCities } from "@/lib/cities";

/**
 * "Don't miss out" — but on WhatsApp, which is the whole reason it works
 * here. An email roundup in Nigeria is a message nobody opens; the same
 * message on WhatsApp is one people read on the way to work.
 *
 * IT MUST RENDER INSIDE THE .lp SCOPE. Every colour below comes from a
 * custom property defined on .lp, and CSS drops a declaration whose
 * custom property is undefined without any error at all. Rendered outside
 * that scope this component does not fall over — it quietly loses its
 * coral, its paper fill and its hairlines and comes out as grey text on
 * black with an invisible button. It is mounted from ExploreBoard for
 * exactly this reason.
 *
 * THE SHAPE IS HEADER / BODY / FOOTER, taken from the reference: a title
 * bar with the close on the left and the label centred, a body that does
 * the asking, and a footer holding the one action, each separated by a
 * hairline. That is what makes a modal read as a piece of an app rather
 * than as a paragraph floating in a box.
 *
 * HOW IT BEHAVES, WHICH MATTERS MORE THAN HOW IT LOOKS. A pop-up is an
 * interruption, and an interruption that ignores an answer is the reason
 * people hate pop-ups. So:
 *
 *   - It waits. Nothing appears until somebody has been on the page long
 *     enough to have looked at it. A modal over a page you have not read
 *     yet is asking before offering.
 *   - Dismissing it is remembered for three months, subscribing forever.
 *     Both live in localStorage, so it is per-browser and needs no
 *     account — the same trade the rest of the storefront makes.
 *   - Escape closes it, the backdrop closes it, and focus moves into it
 *     when it opens.
 *
 * WHY THE CONSENT LINE IS PLAIN. This list belongs to CrowdBuzz, not to
 * an organiser — a different relationship from the one at checkout, and
 * the copy says which it is rather than letting somebody assume.
 */

const SEEN_KEY = "crowdbuzz-discovery-popup";
const DELAY_MS = 9000;
const DISMISS_DAYS = 90;

type Stored = { at: number; done: boolean };

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    // A private window, or storage switched off. Treat it as never seen —
    // the worst case is somebody sees this once per session, which is
    // better than never being able to subscribe at all.
    return null;
  }
}

function store(done: boolean) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ at: Date.now(), done }));
  } catch {
    // Nothing to do. It will ask again next time, which is survivable.
  }
}

export function DiscoveryPopup() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const closerRef = useRef<HTMLButtonElement>(null);

  // Biggest first, home market first. NOT knownCities(), which sorts by
  // country name and therefore opened this picker with Calgary, Cotonou
  // and Toronto — on a Nigeria-first product.
  const cities = useMemo(() => popularCities(10), []);

  useEffect(() => {
    const stored = readStored();
    if (stored?.done) return; // Already subscribed. Never ask again.
    if (stored && Date.now() - stored.at < DISMISS_DAYS * 864e5) return;

    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    closerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    store(false);
  };

  const toggleCity = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await subscribeToDiscovery(phone, picked);
      if (!res.success) {
        setError(res.error ?? "That didn't save.");
        return;
      }
      setDone(true);
      store(true);
      window.setTimeout(() => setOpen(false), 2400);
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cb-popup-title"
    >
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[3px]"
      />

      {/* Flush to the bottom edge on a phone, where a sheet is the native
          shape and a floating card with margins is not. A real card again
          from sm up, where there is room around it. */}
      <div className="sf-rise relative w-full max-w-[440px] overflow-hidden rounded-t-[26px] border border-[var(--hairline-firm)] bg-[var(--ground-deep)] shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.9)] sm:rounded-[26px] sm:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]">
        {/* The colour of the thing, thrown behind the top of the panel so
            it is not a black box. Non-interactive and behind everything. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-90"
          style={{
            background:
              "radial-gradient(70% 100% at 18% 0%, rgba(255,106,69,0.32) 0%, rgba(255,106,69,0) 68%), radial-gradient(60% 90% at 92% 4%, rgba(155,227,192,0.20) 0%, rgba(155,227,192,0) 66%)",
          }}
        />

        {/* ── Title bar ────────────────────────────────────────────── */}
        <div className="relative flex items-center gap-2 border-b border-[var(--hairline)] px-3 py-3">
          <button
            ref={closerRef}
            onClick={close}
            aria-label="No thanks"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--on-ground-soft)] transition-colors hover:bg-white/10 hover:text-[var(--on-ground)]"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </button>
          <p className="flex-1 text-center text-[13px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">
            Don&rsquo;t miss out
          </p>
          {/* Balances the close button so the label sits on the true centre. */}
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        {done ? (
          <div className="relative px-6 py-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--mint)]/20">
              <Check className="h-7 w-7 text-[var(--mint)]" strokeWidth={3} />
            </div>
            <p className="mt-4 text-[21px] font-extrabold tracking-[-0.02em] text-[var(--on-ground)]">
              You&rsquo;re on the list.
            </p>
            <p className="mt-1.5 text-[14px] text-[var(--on-ground-soft)]">
              We&rsquo;ll message you on WhatsApp when something good is on.
            </p>
          </div>
        ) : (
          <>
            {/* ── Body ───────────────────────────────────────────────── */}
            <div className="relative px-6 pb-6 pt-6">
              <h2
                id="cb-popup-title"
                className="text-[27px] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--on-ground)]"
              >
                The best nights, straight to your WhatsApp.
              </h2>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[var(--on-ground-soft)]">
                One message a week. Parties, concerts, comedy — whatever is
                actually worth leaving the house for.
              </p>

              <label
                htmlFor="cb-popup-phone"
                className="mt-6 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--on-ground-faint)]"
              >
                WhatsApp number
              </label>
              <input
                id="cb-popup-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 123 4567"
                className="mt-2 h-[52px] w-full rounded-[14px] border border-[var(--hairline-firm)] bg-black/25 px-4 text-[16px] font-semibold text-[var(--on-ground)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--on-ground-faint)] focus:border-[var(--coral)]"
              />

              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--on-ground-faint)]">
                Where are you?
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {cities.map((c) => {
                  const on = picked.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleCity(c.key)}
                      aria-pressed={on}
                      className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition-all active:scale-95 ${
                        on
                          ? "border-[var(--coral)] bg-[var(--coral)] text-[var(--ink)]"
                          : "border-[var(--hairline-firm)] text-[var(--on-ground-soft)] hover:border-[var(--on-ground-faint)] hover:text-[var(--on-ground)]"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[11.5px] text-[var(--on-ground-faint)]">
                Pick none and you&rsquo;ll hear about everywhere.
              </p>

              {error && (
                <p className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2.5 text-[13px] font-bold text-[var(--danger)]">
                  {error}
                </p>
              )}
            </div>

            {/* ── Action ─────────────────────────────────────────────── */}
            <div className="relative border-t border-[var(--hairline)] p-4">
              <button
                onClick={submit}
                disabled={pending || !phone.trim()}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--coral)] text-[15px] font-extrabold text-[var(--ink)] transition-transform hover:-translate-y-[1px] active:scale-[0.99] disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? "Adding you…" : "Keep me posted"}
              </button>
              <p className="mt-3 text-center text-[11.5px] leading-relaxed text-[var(--on-ground-faint)]">
                From CrowdBuzz, not from any organiser. Reply STOP any time.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
