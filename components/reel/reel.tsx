"use client";

import { useEffect, useState } from "react";
import { EventCardMock, TicketMock, TiersMock, DoorMock } from "@/components/marketing/mockups";
import { StatTiles } from "@/components/charts/figures";
import { ExploreCard } from "@/components/storefront/explore-card";
import { trend } from "@/lib/dashboard-shape";
import type { ExploreEvent } from "@/lib/explore";
import { easeOut, lerp, prog, scene } from "./timing";
import {
  Caption, Serif, FeeRace, SplitDiagram, Phone,
  RATE, CAP, FREE_BELOW,
} from "./scenes";

/**
 * The launch reel.
 *
 * BUILT AS A SEEKABLE PAGE, NOT A SCREEN RECORDING. Everything is a pure
 * function of one number, so the recorder can ask for frame 900 and get
 * exactly the same pixels every time. That is what makes a clean 30fps
 * capture possible on a machine with no GPU — a wall-clock animation
 * recorded live would judder wherever the container happened to be busy.
 *
 * IT SHOWS THE REAL PRODUCT. The ticket, the tier picker, the scanner,
 * the Explore card and the dashboard tiles are the components that ship,
 * imported here rather than redrawn — so the video cannot flatter a
 * screen that does not look like that. The DATA is sample data, and the
 * closing card says so.
 */

/** Dates relative to filming day, so the reel never ages into the past. */
const iso = (plus: number) => {
  const d = new Date();
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
};

const DEMO: ExploreEvent[] = [
  {
    id: "reel-1", title: "Owambe Night: The Aunties Take Over", date: iso(0), time: "8:00 PM",
    location: "Victoria Island", cover: null, hostName: "Bodega Lagos", hostHandle: null,
    fromKobo: 1_500_000, going: 412, interested: 1284, saved: false,
  },
  {
    id: "reel-2", title: "Sunset Sessions Vol. 4", date: iso(1), time: "6:30 PM",
    location: "Lekki Phase 1", cover: null, hostName: "Field Notes NG", hostHandle: null,
    fromKobo: 500_000, going: 188, interested: 96, saved: true,
  },
  {
    id: "reel-3", title: "Alté Sunday", date: iso(5), time: "2:00 PM",
    location: "Ikeja", cover: null, hostName: "Terra Kulture", hostHandle: null,
    fromKobo: 0, going: 64, interested: 210, saved: false,
  },
];

export const REEL_MS = 56_000;

/** start, duration */
const S = {
  title: [0, 4000],
  fee: [4000, 7000],
  build: [11_000, 6000],
  link: [17_000, 6500],
  buy: [23_500, 6500],
  door: [30_000, 5500],
  money: [35_500, 8000],
  dash: [43_500, 6500],
  close: [50_000, 6000],
} as const;

export function Reel({ format = "wide" }: { format?: "wide" | "tall" }) {
  const [t, setT] = useState(0);
  /**
   * A phone cut, not a letterbox.
   *
   * The first vertical version was the 16:9 film with a blurred backdrop
   * top and bottom — standard, and useless here: the copy ended up a
   * quarter of the frame tall and unreadable on the WhatsApp Status this
   * is mostly going to be watched on. So the reel lays itself out
   * vertically instead — the same scenes, stacked, at full size.
   */
  const tall = format === "tall";

  // The recorder drives this. Left running on its own so the page is also
  // watchable in a browser without any tooling.
  useEffect(() => {
    (window as unknown as { __seek: (ms: number) => void }).__seek = setT;
    (window as unknown as { __reelMs: number }).__reelMs = REEL_MS;

    if (new URLSearchParams(window.location.search).has("seek")) return;
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      setT((performance.now() - started) % REEL_MS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const sc = (k: keyof typeof S) => scene(t, S[k][0], S[k][1]);

  const rowClass = tall
    ? "flex w-full flex-col items-start gap-12"
    : "flex w-full items-center gap-24";
  const leadClass = tall ? "w-full" : "w-[740px] shrink-0";

  return (
    <div
      className={`lp relative overflow-hidden bg-[var(--ground)] font-[family-name:var(--font-bricolage-grotesque)] ${
        tall ? "h-[1920px] w-[1080px]" : "h-[1080px] w-[1920px]"
      }`}
      data-reel="1"
    >
      {/* A wash that drifts across the whole reel, so no scene is flat. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 60% at 14% 12%, rgba(255,106,69,0.34) 0%, rgba(255,106,69,0) 62%), radial-gradient(46% 52% at 88% 84%, rgba(221,187,245,0.22) 0%, rgba(221,187,245,0) 60%)",
          transform: `translateX(${lerp(-60, 60, t / REEL_MS)}px)`,
        }}
      />

      {/* ── 1. Title ─────────────────────────────────────── */}
      <Stage tall={tall} s={sc("title")}>
        <div className="flex flex-col items-center text-center">
          <span
            className="flex h-[104px] w-[104px] rotate-[-4deg] items-center justify-center rounded-3xl border-[5px] border-[var(--ink)] bg-[var(--coral)] text-[52px] font-black text-white"
            style={{
              transform: `rotate(-4deg) scale(${lerp(0.7, 1, easeOut(prog(sc("title").t, 0, 800)))})`,
            }}
          >
            D
          </span>
          <h1 className="mt-10 text-[110px] font-extrabold leading-none tracking-[-0.045em]">
            Doorlane
          </h1>
          <p
            className="mt-6 text-[34px] text-[var(--on-ground-soft)]"
            style={{ opacity: easeOut(prog(sc("title").t, 900, 800)) }}
          >
            Event ticketing, <Serif>built for Nigeria.</Serif>
          </p>
        </div>
      </Stage>

      {/* ── 2. What a percentage does ────────────────────── */}
      <Stage tall={tall} s={sc("fee")} align="left">
        <Caption tall={tall} kicker="The problem" t={sc("fee").t}>
          Everyone else takes
          <br />
          <Serif>a percentage. Forever.</Serif>
        </Caption>
        <div className="mt-14">
          <FeeRace t={sc("fee").t} />
        </div>
      </Stage>

      {/* ── 3. Put it up ─────────────────────────────────── */}
      <Stage tall={tall} s={sc("build")} align="left">
        <div className={rowClass}>
          <div className={leadClass}>
            <Caption tall={tall} kicker="Step one" t={sc("build").t}>
              Put it up in
              <br />
              <Serif>four minutes.</Serif>
            </Caption>
            <p
              className="mt-8 max-w-[560px] text-[25px] leading-relaxed text-[var(--on-ground-soft)]"
              style={{ opacity: easeOut(prog(sc("build").t, 900, 700)) }}
            >
              Name it, price the tiers, set how many. Early bird, general,
              tables — as many as you like, each with its own limit.
            </p>
          </div>
          <div
            className={tall ? "flex w-full flex-col items-center gap-14" : "flex items-center gap-10"}
            style={{
              opacity: easeOut(prog(sc("build").t, 700, 900)),
              transform: `translateY(${lerp(50, 0, easeOut(prog(sc("build").t, 700, 900)))}px)`,
            }}
          >
            <div className={tall ? "scale-[1.5]" : "scale-[1.35]"}><TiersMock /></div>
            <div
              className="scale-[1.2]"
              style={{ opacity: easeOut(prog(sc("build").t, 1600, 900)) }}
            >
              <EventCardMock />
            </div>
          </div>
        </div>
      </Stage>

      {/* ── 4. One link ──────────────────────────────────── */}
      <Stage tall={tall} s={sc("link")} align="left">
        <div className={rowClass}>
          <div className={leadClass}>
            <Caption tall={tall} kicker="Step two" t={sc("link").t}>
              Share one link.
              <br />
              <Serif>That&apos;s the whole plan.</Serif>
            </Caption>
            <p
              className="mt-8 max-w-[560px] text-[25px] leading-relaxed text-[var(--on-ground-soft)]"
              style={{ opacity: easeOut(prog(sc("link").t, 900, 700)) }}
            >
              It lands on Explore too — every event on Doorlane, city by
              city, with who is putting it on.
            </p>
          </div>
          <div className={tall ? "flex w-full flex-col gap-4" : "flex w-[860px] flex-col gap-5"}>
            {DEMO.map((e, i) => (
              <div
                key={e.id}
                style={{
                  opacity: easeOut(prog(sc("link").t, 600 + i * 320, 800)),
                  transform: `translateX(${lerp(60, 0, easeOut(prog(sc("link").t, 600 + i * 320, 800)))}px)`,
                }}
              >
                <ExploreCard event={e} size="lg" />
              </div>
            ))}
          </div>
        </div>
      </Stage>

      {/* ── 5. They buy ──────────────────────────────────── */}
      <Stage tall={tall} s={sc("buy")} align="left">
        <div className={rowClass}>
          <div className={leadClass}>
            <Caption tall={tall} kicker="Step three" t={sc("buy").t}>
              They pay. The ticket
              <br />
              <Serif>arrives in seconds.</Serif>
            </Caption>
            <p
              className="mt-8 max-w-[600px] text-[25px] leading-relaxed text-[var(--on-ground-soft)]"
              style={{ opacity: easeOut(prog(sc("buy").t, 900, 700)) }}
            >
              No app to download. No account to make. Card, transfer or a
              virtual account — then a QR code by email and WhatsApp.
            </p>
          </div>
          <div className={tall ? "flex w-full flex-col items-center gap-10" : "flex items-center gap-12"}>
            <Phone t={sc("buy").t} at={500} tilt={-3}>
              <div className="flex h-full flex-col justify-center bg-[var(--ground-deep)] p-6">
                <div className="scale-[0.98]"><TicketMock /></div>
              </div>
            </Phone>
            <div
              className={tall ? "w-full text-center" : "w-[300px]"}
              style={{ opacity: easeOut(prog(sc("buy").t, 1800, 800)) }}
            >
              <p className="text-[19px] font-bold uppercase tracking-[0.2em] text-[var(--marker)]">
                Sent instantly
              </p>
              <p className="mt-3 text-[27px] font-bold leading-snug text-[var(--on-ground-soft)]">
                One QR per seat, not per order.
              </p>
            </div>
          </div>
        </div>
      </Stage>

      {/* ── 6. At the door ───────────────────────────────── */}
      <Stage tall={tall} s={sc("door")} align="left">
        <div className={rowClass}>
          <div className={leadClass}>
            <Caption tall={tall} kicker="On the night" t={sc("door").t}>
              Scan them in
              <br />
              <Serif>from your phone.</Serif>
            </Caption>
            <p
              className="mt-8 max-w-[600px] text-[25px] leading-relaxed text-[var(--on-ground-soft)]"
              style={{ opacity: easeOut(prog(sc("door").t, 900, 700)) }}
            >
              A used ticket says so, loudly. No hardware, no extra app, and
              anyone on the door can do it.
            </p>
          </div>
          <Phone t={sc("door").t} at={500} tilt={3}>
            <div className="flex h-full flex-col justify-center bg-[var(--ground-deep)] p-6">
              <div className="scale-[1.02]"><DoorMock /></div>
            </div>
          </Phone>
        </div>
      </Stage>

      {/* ── 7. Where the money goes ──────────────────────── */}
      <Stage tall={tall} s={sc("money")} align="left">
        <Caption tall={tall} kicker="The part that matters" t={sc("money").t}>
          We never hold <Serif>your money.</Serif>
        </Caption>
        <div className="mt-12">
          <SplitDiagram t={sc("money").t} />
        </div>
      </Stage>

      {/* ── 8. What you see afterwards ───────────────────── */}
      <Stage tall={tall} s={sc("dash")} align="left">
        <Caption tall={tall} kicker="And afterwards" t={sc("dash").t}>
          Every figure with <Serif>a direction on it.</Serif>
        </Caption>
        <div
          className={`dl mt-14 w-full rounded-[6px] ${tall ? "max-w-[940px]" : "max-w-[1500px]"}`}
          style={{
            opacity: easeOut(prog(sc("dash").t, 700, 900)),
            transform: `translateY(${lerp(40, 0, easeOut(prog(sc("dash").t, 700, 900)))}px)`,
          }}
        >
          <StatTiles
            items={[
              { label: "Money taken", value: "₦12,480,000", trend: trend(1248000000, 402000000), spark: SPARK, note: "last 30 days", tone: "money" },
              { label: "Settled to you", value: "₦11,983,200", trend: trend(1198320000, 402000000), spark: SPARK, note: "after fees", tone: "money" },
              { label: "Tickets sold", value: "1,284", trend: trend(1284, 980), spark: SPARK, tone: "count" },
              { label: "Interested", value: "3,902", trend: trend(3902, 2100), spark: SPARK, note: "saved, not bought yet", tone: "group" },
            ]}
          />
        </div>
        <p
          className="mt-8 text-[24px] text-[var(--on-ground-soft)]"
          style={{ opacity: easeOut(prog(sc("dash").t, 2200, 700)) }}
        >
          Thirty days against the thirty before them — because an all-time
          total can never warn you about anything.
        </p>
      </Stage>

      {/* ── 9. Close ─────────────────────────────────────── */}
      <Stage tall={tall} s={sc("close")}>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-[84px] w-[84px] rotate-[-4deg] items-center justify-center rounded-3xl border-[5px] border-[var(--ink)] bg-[var(--coral)] text-[42px] font-black text-white">
            D
          </span>
          <h2 className="mt-9 text-[86px] font-extrabold leading-none tracking-[-0.04em]">
            {RATE} a ticket.
          </h2>
          <p className="mt-5 text-[52px] font-extrabold leading-none tracking-[-0.03em] text-[var(--coral)]">
            Never more than {CAP}.
          </p>
          <p
            className="mt-8 text-[30px] text-[var(--on-ground-soft)]"
            style={{ opacity: easeOut(prog(sc("close").t, 900, 800)) }}
          >
            Free under {FREE_BELOW} a ticket, and on free events.
          </p>
          <p
            className="mt-14 text-[30px] font-bold text-[var(--on-ground)]"
            style={{ opacity: easeOut(prog(sc("close").t, 1700, 800)) }}
          >
            benjamin-ticket.vercel.app
          </p>
          <p
            className="mt-6 text-[17px] text-[var(--on-ground-faint)]"
            style={{ opacity: easeOut(prog(sc("close").t, 2400, 800)) }}
          >
            Product shots are the live interface. Figures shown are sample data.
          </p>
        </div>
      </Stage>
    </div>
  );
}

const SPARK = [0,0,3,1,0,8,12,4,0,0,6,19,22,7,3,0,0,14,31,28,9,2,0,0,17,44,52,20,6,1];

/** One scene, held in the same safe area on every frame. */
function Stage({
  s,
  align = "center",
  tall = false,
  children,
}: {
  s: { on: boolean; opacity: number };
  align?: "center" | "left";
  tall?: boolean;
  children: React.ReactNode;
}) {
  if (!s.on) return null;
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-center ${
        tall ? "px-[72px] py-[80px]" : "px-[120px] py-[90px]"
      }`}
      style={{ opacity: s.opacity }}
    >
      {/* items-start on the outer box collapsed every w-full child to its
          own content width, which is why the diagrams sat in the left
          third of a 1920 frame with half the screen empty. The inner box
          is the measure; alignment happens inside it. */}
      <div
        className={`mx-auto w-full ${tall ? "max-w-[940px]" : "max-w-[1680px]"} ${
          align === "center" ? "flex flex-col items-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
