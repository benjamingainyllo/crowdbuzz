"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * The host's own words, in a bubble that cannot grow past its corner.
 *
 * WHY THIS IS CLAMPED AT ALL. The left column of the event page is a
 * FIXED panel: it holds still while the buying column scrolls past it.
 * That only works if it genuinely fits on the screen, and the one thing
 * on it with no natural limit is this — an organiser can paste six
 * paragraphs about their market's history and did. When that happened the
 * panel grew past the viewport and got an inner scrollbar of its own, so
 * the "fixed" side moved after all, which is the opposite of the point.
 *
 * So the bubble shows as much as fits and no more, and the rest opens in
 * a reader. Nothing is hidden from anybody — it is one tap away, and the
 * tap only appears when there is actually something behind it.
 *
 * THE OVERFLOW IS MEASURED, NOT GUESSED FROM CHARACTER COUNT. How many
 * lines a description takes depends on the column's width and the reader's
 * font, and a character-count threshold gets both wrong: it hides a
 * "Read more" that is needed on a narrow window and shows a dead one on a
 * wide screen. scrollHeight against clientHeight is the browser's own
 * answer to the same question and it is always right.
 *
 * AND THE HEIGHT IS TAKEN FROM THE SPACE LEFT, NOT FROM A LINE COUNT. A
 * fixed clamp of six lines fit a 900px window and clipped the going
 * counter off the bottom of an 800px one, because "how much room is
 * there" is not a constant — it is the panel's height minus everything
 * else in it. So on desktop this is a flex child that absorbs whatever is
 * left over: on a tall window it shows more of the description, on a short
 * one less, and the things below it stay on screen either way. Below lg
 * there is no fixed panel and the page scrolls normally, so nothing is
 * clamped at all and the whole description is simply there.
 */
export function DescriptionBubble({
  text,
  hostName,
}: {
  text: string;
  hostName?: string | null;
}) {
  const clampRef = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  /*
   * Layout effect, so the "Read more" is decided in the same frame the
   * text is painted. In a plain effect the button appears a beat late and
   * the column visibly reflows under the reader.
   *
   * AND THE CLIP LANDS ON A LINE, NOT THROUGH ONE. Clipping by height
   * cuts wherever the box happens to end, which is usually halfway down
   * a row of letters — the reader sees the top half of a sentence and it
   * looks like a rendering fault rather than a deliberate fold. The
   * height is rounded down to a whole number of lines before it is
   * applied, so the last visible line is a whole one.
   *
   * The measurement is taken with the cap removed, so it reads the space
   * flex actually gave the element rather than the cap set last time —
   * otherwise each pass would shrink it by one more line.
   */
  useLayoutEffect(() => {
    const el = clampRef.current;
    if (!el) return;

    const measure = () => {
      el.style.maxHeight = "";
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const available = el.clientHeight;

      if (Number.isFinite(lineHeight) && lineHeight > 0 && available > 0) {
        const lines = Math.max(1, Math.floor(available / lineHeight));
        const snapped = lines * lineHeight;
        if (available - snapped > 0.5) el.style.maxHeight = `${snapped}px`;
      }

      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (el) el.style.maxHeight = "";
    };
  }, [text]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="mt-8 max-w-[52ch] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {hostName && (
          <p className="mb-2 shrink-0 text-[12.5px] font-extrabold tracking-[0.01em] text-[var(--dl-ink-faint)]">
            {hostName}
          </p>
        )}
        {/* NO BOX. This was a rounded, bordered, tinted bubble with a
            tail — a chat message, which was the idea: the host talking
            rather than an institution announcing. On a page that is
            already a stack of panels it read as one more container, and
            the thing inside it is just the host's own words. They sit on
            the page now. */}
        <div className="relative lg:flex lg:min-h-[4.5rem] lg:flex-1 lg:flex-col lg:overflow-hidden">
          <p
            ref={clampRef}
            className="relative whitespace-pre-line text-[14.5px] leading-[1.55] text-[var(--dl-ink)] lg:min-h-0 lg:flex-1 lg:overflow-hidden"
          >
            {text}
          </p>

          {truncated && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 shrink-0 self-start text-[13px] font-extrabold underline underline-offset-2 opacity-80 transition-opacity hover:opacity-100"
            >
              Read more
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="About this event"
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[3px]"
          />
          <div className="relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[22px] border border-[var(--dl-line)] bg-[var(--dl-paper)] text-[var(--dl-ink)] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] sm:rounded-[22px]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--dl-line)] px-5 py-3.5">
              <p className="min-w-0 truncate text-[13px] font-extrabold uppercase tracking-[0.14em] opacity-70">
                {hostName ? `From ${hostName}` : "About this event"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                autoFocus
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/10"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </button>
            </div>
            {/* The one place on this page where scrolling is correct: a
                reader opened on purpose to read a long thing. */}
            <div className="overflow-y-auto px-5 py-5">
              <p className="whitespace-pre-line text-[15px] leading-[1.6]">{text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
