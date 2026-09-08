"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { performRefund } from "@/lib/refunds";

/**
 * An organiser sending their own buyer their money back.
 *
 * THIS DID NOT EXIST. Refunding was an admin-only action, which meant an
 * organiser with an angry buyer at 11pm had to wait for a person at
 * CrowdBuzz to wake up. For a platform whose entire pitch is "we never
 * hold your money", making somebody ask us before they can give their own
 * customer a refund was the wrong shape.
 *
 * The dangerous part is shared with the admin path in lib/refunds.ts, on
 * purpose — see the note there. What lives here is the identity: who is
 * asking, and that the order is theirs.
 */

function fail(message: string) {
  return { success: false as const, error: message };
}

export async function refundOwnOrder(
  orderId: string,
  amountKobo: number,
  reason: string
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return fail("Sign in first.");

    const result = await performRefund({
      orderId,
      amountKobo,
      reason,
      // The ownership check happens inside, against this id. An organiser
      // passing somebody else's order id gets "Order not found" — the same
      // answer as a made-up id, so the request tells them nothing about
      // whether that order exists.
      actor: { userId: user.id, role: "organiser" },
    });

    if (!result.ok) return fail(result.error ?? "That refund did not go through.");

    revalidatePath("/revenue");
    revalidatePath("/overview");

    return {
      success: true as const,
      status: result.status,
      feeReturnedKobo: result.feeReturnedKobo ?? 0,
    };
  } catch (error) {
    console.error("Organiser refund failed", error);
    return fail("That refund did not go through.");
  }
}
