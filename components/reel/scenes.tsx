"use client";

import { formatKobo } from "@/lib/money";
import { TYPICAL_LABEL, typicalFeeNaira } from "@/lib/competitor";
import {
  DEFAULT_PLATFORM_FEE_TYPE,
  DEFAULT_PLATFORM_FEE_VALUE,
  PLATFORM_FEE_CAP_KOBO,
  PLATFORM_FEE_CAP_MAX_KOBO,
  PLATFORM_FEE_FREE_BELOW_KOBO,
  calculatePlatformFeeKobo,
  nairaToKobo,
} from "@/lib/money";
import { easeOut, easeInOut, lerp, prog, clamp01 } from "./timing";

/**
 * The pieces the reel is made of.
 *
 * NUMBERS COME FROM THE FEE ENGINE, NOT FROM A SCRIPT. A launch video is
 * the most-screenshotted thing a company makes; a rate typed into a
 * caption is a rate that will still be on the internet after the pricing
 * changes. Everything quoted here is computed by the same functions that
 * bill a real organiser, so the video cannot outlive its own claims.
 */

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export const RATE = `${DEFAULT_PLATFORM_FEE_VALUE / 100}%`;
export const CAP = formatKobo(PLATFORM_FEE_CAP_KOBO);
/** The ceiling. "Never more than" has to quote this, not CAP. */
export const CAP_MAX = formatKobo(PLATFORM_FEE_CAP_MAX_KOBO);
export const FREE_BELOW = formatKobo(PLATFORM_FEE_FREE_BELOW_KOBO);

/** The table ticket the whole pitch rests on. */
export const TABLE_PRICE = 500_000;
export const OUR_FEE = Math.round(
  calculatePlatformFeeKobo(
    nairaToKobo(TABLE_PRICE),
    DEFAULT_PLATFORM_FEE_TYPE,
    DEFAULT_PLATFORM_FEE_VALUE
  ) / 100
);
export const THEIR_FEE = Math.round(typicalFeeNaira(TABLE_PRICE));

/* ── Shared furniture ─────────────────────────────────────── */

export function Caption({
  kicker,
  children,
  t,
  at = 0,
  tall = false,
}: {
  kicker?: string;
  children: React.ReactNode;
  t: number;
  at?: number;
  tall?: boolean;
}) {
  const p = easeOut(prog(t, at, 700));
  return (
    <div
      style={{ opacity: p, transform: `translateY(${lerp(18, 0, p)}px)` }}
      className={tall ? "max-w-[940px]" : "max-w-[1100px]"}
    >
      {kicker && (
        <p className="mb-4 text-[15px] font-bold uppercase tracking-[0.28em] text-[var(--coral)]">
          {kicker}
        </p>
      )}
      <div
        className={`font-extrabold leading-[1.02] tracking-[-0.035em] text-[var(--on-ground)] ${
          tall ? "text-[74px]" : "text-[62px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function Serif({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic">
      {children}
    </span>
  );
}

/** A number that counts up and can be told to stop dead. */
export function Counter({
  to,
  t,
  at,
  dur,
  stopAt,
}: {
  to: number;
  t: number;
  at: number;
  dur: number;
  /** The value it refuses to go past — the cap, made visible. */
  stopAt?: number;
}) {
  const raw = lerp(0, to, easeOut(prog(t, at, dur)));
  return <>{naira(stopAt !== undefined ? Math.min(raw, stopAt) : raw)}</>;
}

/* ── Scene 2: what a percentage does ──────────────────────── */

export function FeeRace({ t }: { t: number }) {
  const theirs = clamp01(prog(t, 900, 2600));
  const ours = clamp01(prog(t, 900, 2600));
  const capped = OUR_FEE / THEIR_FEE;

  const bar = (w: number, colour: string) => ({
    width: `${w * 100}%`,
    background: colour,
    transition: "none" as const,
  });

  return (
    <div className="w-full max-w-[1400px]">
      <p className="text-[19px] font-semibold text-[var(--on-ground-soft)]">
        One table at {naira(TABLE_PRICE)}
      </p>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <p className="text-[21px] font-bold text-[var(--on-ground-soft)]">
            {TYPICAL_LABEL} platform
          </p>
          <p className="text-[46px] font-extrabold tabular-nums text-[var(--on-ground-soft)]">
            <Counter to={THEIR_FEE} t={t} at={900} dur={2600} />
          </p>
        </div>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full" style={bar(easeOut(theirs), "#8D8482")} />
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <p className="text-[21px] font-bold text-[var(--coral)]">CrowdBuzz</p>
          <p className="text-[46px] font-extrabold tabular-nums text-[var(--coral)]">
            <Counter to={THEIR_FEE} t={t} at={900} dur={2600} stopAt={OUR_FEE} />
          </p>
        </div>
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full"
            style={bar(Math.min(easeOut(ours), capped), "#FF6A45")}
          />
        </div>
        <p
          className="mt-4 text-[21px] font-bold text-[var(--marker)]"
          style={{ opacity: easeOut(prog(t, 2600, 700)) }}
        >
          Capped at {CAP}. It stops. Theirs doesn&apos;t.
        </p>
      </div>
    </div>
  );
}

/* ── Scene 7: where the money goes ────────────────────────── */

export function SplitDiagram({ t }: { t: number }) {
  const drop = easeOut(prog(t, 300, 800));
  const split = easeInOut(prog(t, 1300, 1100));
  const land = easeOut(prog(t, 2400, 800));

  const node =
    "rounded-2xl border border-[var(--hairline-firm)] bg-[var(--ground-raised)] px-8 py-6 text-center";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center">
      <div style={{ opacity: drop, transform: `translateY(${lerp(-20, 0, drop)}px)` }} className={node}>
        <p className="text-[15px] font-bold uppercase tracking-[0.18em] text-[var(--on-ground-faint)]">
          Somebody pays
        </p>
        <p className="mt-2 text-[40px] font-extrabold tabular-nums">{naira(TABLE_PRICE)}</p>
      </div>

      <div className="relative my-8 h-24 w-full max-w-[760px]">
        <svg viewBox="0 0 620 96" className="h-full w-full" aria-hidden="true">
          <path
            d="M310 0 L310 34 M310 34 C310 70, 120 44, 120 92 M310 34 C310 70, 500 44, 500 92"
            fill="none"
            stroke="#FF6A45"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="420"
            strokeDashoffset={lerp(420, 0, split)}
          />
        </svg>
      </div>

      <div className="grid w-full grid-cols-2 gap-8" style={{ opacity: land }}>
        <div className={`${node} border-[var(--coral)]`} style={{ transform: `translateY(${lerp(16, 0, land)}px)` }}>
          <p className="text-[15px] font-bold uppercase tracking-[0.18em] text-[var(--on-ground-faint)]">
            Straight to your bank
          </p>
          <p className="mt-2 text-[40px] font-extrabold tabular-nums text-[var(--mint)]">
            {naira(TABLE_PRICE - OUR_FEE)}
          </p>
        </div>
        <div className={node} style={{ transform: `translateY(${lerp(16, 0, land)}px)` }}>
          <p className="text-[15px] font-bold uppercase tracking-[0.18em] text-[var(--on-ground-faint)]">
            CrowdBuzz
          </p>
          <p className="mt-2 text-[40px] font-extrabold tabular-nums text-[var(--on-ground-soft)]">
            {naira(OUR_FEE)}
          </p>
        </div>
      </div>

      <p
        className="mt-10 text-[26px] font-bold text-[var(--on-ground-soft)]"
        style={{ opacity: easeOut(prog(t, 3300, 700)) }}
      >
        At the moment of payment. No wallet, no balance,{" "}
        <span className="text-[var(--on-ground)]">nothing to withdraw.</span>
      </p>
    </div>
  );
}

/* ── A phone, for the product shots ───────────────────────── */

export function Phone({
  children,
  t,
  at = 0,
  tilt = 0,
}: {
  children: React.ReactNode;
  t: number;
  at?: number;
  tilt?: number;
}) {
  const p = easeOut(prog(t, at, 900));
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${lerp(40, 0, p)}px) rotate(${tilt}deg) scale(${lerp(0.96, 1, p)})`,
      }}
      className="relative h-[660px] w-[326px] shrink-0 overflow-hidden rounded-[42px] border-[10px] border-[#241430] bg-[var(--ground)] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
    >
      <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-[#241430]" />
      <div className="h-full w-full overflow-hidden">{children}</div>
    </div>
  );
}
