"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { refundOwnOrder } from "@/app/actions/refunds";
import { formatKobo } from "@/lib/money";

/**
 * Giving a buyer their money back, from the organiser's own dashboard.
 *
 * TWO CLICKS AND A REASON, NOT ONE CLICK. A refund is irreversible and
 * comes out of money that has already landed in somebody's bank, so the
 * button opens a confirmation that states the amount in words before it
 * will do anything. The reason is required because it is the only thing
 * that will explain this row to whoever reads it in three months — the
 * organiser themselves, usually.
 *
 * It also says what happens to our fee, because the fee coming back is
 * the part an organiser does not expect and would otherwise have to ask
 * about.
 */
export function RefundButton({
  orderId,
  grossKobo,
  platformFeeKobo,
  buyerLabel,
  onDone,
}: {
  orderId: string;
  grossKobo: number;
  platformFeeKobo: number;
  buyerLabel: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const submit = () => {
    if (!reason.trim()) {
      toast.error("Say why — it goes on the record.");
      return;
    }
    start(async () => {
      const res = await refundOwnOrder(orderId, grossKobo, reason.trim());
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.status === "refunded"
          ? `${formatKobo(grossKobo)} sent back to ${buyerLabel}.`
          : `Refund started. ${formatKobo(grossKobo)} is on its way back to ${buyerLabel}.`
      );
      setOpen(false);
      setReason("");
      onDone?.();
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--dl-line)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--dl-ink-soft)] transition-colors hover:border-[var(--dl-danger)] hover:text-[var(--dl-danger)]"
      >
        Refund
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--dl-line)] bg-[var(--dl-panel)] p-4 text-left">
      <p className="text-[13.5px] font-bold">
        Send {formatKobo(grossKobo)} back to {buyerLabel}?
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
        This cannot be undone, and the money comes out of your account.
        {platformFeeKobo > 0 && (
          <> Our {formatKobo(platformFeeKobo)} fee on it comes back to you too.</>
        )}
      </p>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why? e.g. buyer could not attend"
        className="mt-3 w-full rounded-lg border border-[var(--dl-line)] bg-[var(--dl-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[var(--coral)]"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-[var(--dl-danger)] px-3.5 py-2 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Sending…" : "Yes, refund it"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
          disabled={pending}
          className="rounded-lg border border-[var(--dl-line)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--dl-ink-soft)]"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
