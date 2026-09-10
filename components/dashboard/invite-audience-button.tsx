"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { inviteAudienceToEvent } from "@/app/actions/audience";

/**
 * "Tell the people who came last time."
 *
 * The second-event engine, as one button. An organiser's first night
 * earns them an audience; this is how their second night reaches it,
 * without exporting a spreadsheet or pasting numbers into a broadcast.
 *
 * TWO CLICKS, BECAUSE IT CANNOT BE UNDONE. A WhatsApp message that has
 * gone is gone, and it goes to real people who agreed to hear from this
 * organiser once. The confirmation states the number out loud first.
 *
 * IT DISAPPEARS WHEN THERE IS NOBODY TO TELL. An organiser with an empty
 * list should not be looking at a button that does nothing — they should
 * be seeing the explanation, which is what the empty state says.
 *
 * THE SIZE IS A PROP, NOT A FETCH. It is the same number for every card
 * on the page, so the page reads it once and hands it down. Ten cards
 * each asking the server the same question is ten round trips for one
 * answer.
 */
export function InviteAudienceButton({
  eventId,
  eventTitle,
  size,
}: {
  eventId: string;
  eventTitle: string;
  size: number;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (size === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-[var(--dl-ink-faint)]">
        Nobody on your list yet. Guests join it by ticking a box at checkout,
        so this fills up as you sell — then one tap tells all of them about
        your next event.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-[13px] font-semibold text-[var(--dl-ink-soft)]">
        Sent. Your guests know about {eventTitle}.
      </p>
    );
  }

  const send = () => {
    start(async () => {
      const res = await inviteAudienceToEvent(eventId);
      if (!res.success) {
        toast.error(res.error ?? "That invitation did not go out.");
        setOpen(false);
        return;
      }
      setDone(true);
      setOpen(false);
      toast.success(
        res.failed
          ? `Told ${res.sent} people. ${res.failed} could not be reached.`
          : `Told ${res.sent} ${res.sent === 1 ? "person" : "people"}.`
      );
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--dl-line)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--dl-ink)] transition-colors hover:border-[var(--coral)] hover:text-[var(--coral)]"
      >
        <Send className="h-3.5 w-3.5" />
        Tell your {size} past {size === 1 ? "guest" : "guests"}
      </button>
    );
  }

  return (
    <div className="dl-card p-4 text-left">
      <p className="text-[13.5px] font-bold">
        Message {size} {size === 1 ? "person" : "people"} on WhatsApp about{" "}
        {eventTitle}?
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
        These are guests from your past events who asked to hear from you. It
        goes out once and cannot be taken back, and you can only do this once
        for this event.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={send}
          disabled={pending}
          className="flex items-center gap-2 rounded-[8px] bg-[var(--coral)] px-3.5 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Sending…" : "Yes, tell them"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="dl-btn text-[var(--dl-ink-soft)]"
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
