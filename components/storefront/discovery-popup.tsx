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
 *     when it opens and back out when it closes.
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
  const panelRef = useRef<HTMLDivElement>(null);
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
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cb-popup-title"
    >
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        className="sf-rise relative w-full max-w-[420px] rounded-[22px] border border-[var(--hairline-firm)] bg-[var(--ground-deep)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <button
          ref={closerRef}
          onClick={close}
          aria-label="No thanks"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[var(--on-ground-soft)] transition-colors hover:bg-white/10 hover:text-[var(--on-ground)]"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--mint)]/20">
              <Check className="h-6 w-6 text-[var(--mint)]" strokeWidth={3} />
            </div>
            <p className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">
              You&rsquo;re on the list.
            </p>
            <p className="mt-1.5 text-[14px] text-[var(--on-ground-soft)]">
              We&rsquo;ll message you on WhatsApp when something good is on.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--coral)]">
              Don&rsquo;t miss out
            </p>
            <h2
              id="cb-popup-title"
              className="mt-2 text-[24px] font-extrabold leading-[1.1] tracking-[-0.03em]"
            >
              The best nights, straight to your WhatsApp.
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--on-ground-soft)]">
              One message a week. Parties, concerts, comedy — whatever is
              actually worth leaving the house for.
            </p>

            <label
              htmlFor="cb-popup-phone"
              className="mt-5 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--on-ground-soft)]"
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
              className="mt-2 h-12 w-full rounded-xl border border-[var(--hairline-firm)] bg-[var(--ground-raised)] px-4 text-[15px] outline-none placeholder:text-[var(--on-ground-faint)] focus:border-[var(--coral)]"
            />

            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--on-ground-soft)]">
              Where are you?
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cities.map((c) => {
                const on = picked.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCity(c.key)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                      on
                        ? "border-[var(--coral)] bg-[var(--coral)]/15 text-[var(--on-ground)]"
                        : "border-[var(--hairline-firm)] text-[var(--on-ground-soft)] hover:text-[var(--on-ground)]"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11.5px] text-[var(--on-ground-faint)]">
              Pick none and you&rsquo;ll hear about everywhere.
            </p>

            {error && (
              <p className="mt-3 text-[13px] font-bold text-[var(--coral)]">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={pending || !phone.trim()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] text-[14px] font-extrabold text-[var(--ink)] transition-transform hover:-translate-y-[1px] disabled:opacity-45 disabled:hover:translate-y-0"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Adding you…" : "Keep me posted"}
            </button>

            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--on-ground-faint)]">
              From CrowdBuzz, not from any organiser. One message a week, and
              reply STOP any time to end it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
