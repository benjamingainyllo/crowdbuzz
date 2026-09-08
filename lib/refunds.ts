import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";

/**
 * Sending a buyer their money back. One implementation, two callers.
 *
 * An organiser refunding their own buyer and an admin refunding anybody
 * are the same dangerous operation with different permission around it.
 * Written twice, the second copy is always the weaker one — it is the copy
 * that forgets the over-refund guard, or calls the provider before it has
 * written anything down. So there is one copy, and the difference between
 * the two callers is a single ownership check and what goes in the log.
 *
 * THE ORDER OF OPERATIONS IS THE SAFETY. A row is written as "processing"
 * BEFORE the provider is called and updated after. If the process dies
 * mid-call the record says a refund was attempted — recoverable — rather
 * than saying nothing, which would leave money moved and no trace of who
 * moved it.
 */

export type RefundRole = "admin" | "organiser";

export interface RefundActor {
  userId: string;
  role: RefundRole;
}

export interface RefundOutcome {
  ok: boolean;
  error?: string;
  status?: "processing" | "refunded" | "failed";
  /** For the caller's audit line: the state of the order before this ran. */
  before?: { status: string; alreadyRefundedKobo: number };
  amountKobo?: number;
  feeReturnedKobo?: number;
  reference?: string;
}

/**
 * Our share of a refund, in proportion to how much of the order went back.
 *
 * WHY THIS EXISTS. Until now nothing reversed the platform fee: the refund
 * was recorded, the order was marked, and our cut stayed where it was. On a
 * full refund that means keeping a cut of a sale that did not happen, which
 * is not a position worth defending to an organiser.
 *
 * Proportional rather than all-or-nothing so a partial refund behaves —
 * half the order back means half the fee back.
 *
 * WHAT THIS NUMBER IS, AND IS NOT. It is the authoritative record of what
 * we owe back on this refund. Whether the money physically leaves our
 * balance depends on the payment provider unwinding the original split,
 * which is the provider's behaviour and not something this code performs.
 * Where it does not, this column is the amount to settle by hand — the
 * point is that it is now computed and recorded rather than remembered.
 */
export function feeReturnedKobo(
  platformFeeKobo: number,
  amountRefundedKobo: number,
  grossKobo: number
): number {
  if (grossKobo <= 0 || platformFeeKobo <= 0) return 0;
  const share = Math.round((platformFeeKobo * amountRefundedKobo) / grossKobo);
  // Never hand back more fee than we charged, whatever rounding does.
  return Math.max(0, Math.min(share, platformFeeKobo));
}

export async function performRefund(params: {
  orderId: string;
  amountKobo: number;
  reason: string;
  actor: RefundActor;
}): Promise<RefundOutcome> {
  const { orderId, amountKobo, reason, actor } = params;

  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
    return { ok: false, error: "Enter a real amount." };
  }
  if (!reason.trim()) return { ok: false, error: "Say why. It goes in the log." };

  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, reference, status, gross_kobo, platform_fee_kobo, event_id, creator_id, buyer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found." };

  // The whole difference between the two callers. An organiser reaches
  // this through their own dashboard, so the only thing standing between
  // them and somebody else's buyer is this line.
  if (actor.role === "organiser" && order.creator_id !== actor.userId) {
    return { ok: false, error: "Order not found." };
  }

  if (order.status !== "paid") {
    return { ok: false, error: `That order is ${order.status}, not paid. Nothing to refund.` };
  }

  // What has already gone back, counting attempts still in flight — a
  // refund that is processing is money committed, not money available.
  const { data: existing } = await db
    .from("refunds")
    .select("amount_kobo, status")
    .eq("order_id", orderId);

  const alreadyOut = (existing ?? [])
    .filter((r: any) => r.status !== "failed")
    .reduce((s: number, r: any) => s + Number(r.amount_kobo ?? 0), 0);

  const gross = Number(order.gross_kobo ?? 0);
  if (alreadyOut + amountKobo > gross) {
    return {
      ok: false,
      error:
        `That order took ${gross} kobo and ${alreadyOut} is already refunded. ` +
        `The most you can send back now is ${gross - alreadyOut}.`,
    };
  }

  const feeBack = feeReturnedKobo(Number(order.platform_fee_kobo ?? 0), amountKobo, gross);

  const { data: row, error: insertError } = await db
    .from("refunds")
    .insert({
      order_id: orderId,
      event_id: order.event_id,
      creator_id: order.creator_id,
      amount_kobo: amountKobo,
      platform_fee_returned_kobo: feeBack,
      reason: reason.trim(),
      status: "processing",
      requested_by: actor.userId,
      requested_by_role: actor.role,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    // The column arrives with PART 15 of setup.sql. An organiser who has
    // not run it yet gets a refusal that names the cause, rather than a
    // refund that silently loses the fee it was supposed to record.
    return {
      ok: false,
      error: insertError?.message?.includes("platform_fee_returned_kobo")
        ? "The database is missing a column this needs — run setup.sql, then try again."
        : "Could not start that refund.",
    };
  }

  const provider = getPaymentProvider();
  const result = await provider.refund({
    reference: order.reference,
    amountKobo,
    reason: reason.trim(),
  });

  await db
    .from("refunds")
    .update({
      status: result.ok ? result.status : "failed",
      provider_refund_id: result.providerRefundId ?? null,
      failure_reason: result.ok ? null : (result.error ?? "The provider refused it."),
      completed_at: result.status === "refunded" ? new Date().toISOString() : null,
    })
    .eq("id", row.id);

  // The order only becomes "refunded" when the whole of it has gone back.
  // A partial refund leaves it paid, because it still is.
  if (result.ok && alreadyOut + amountKobo >= gross) {
    await db.from("orders").update({ status: "refunded" }).eq("id", orderId);
  }

  return {
    ok: result.ok,
    error: result.ok ? undefined : (result.error ?? "The provider refused it."),
    status: result.status,
    before: { status: order.status, alreadyRefundedKobo: alreadyOut },
    amountKobo,
    feeReturnedKobo: feeBack,
    reference: order.reference,
  };
}
