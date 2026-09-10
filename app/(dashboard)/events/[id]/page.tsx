"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EventDetailView } from "@/components/dashboard/event-detail-view";

/**
 * One event, as a page.
 *
 * IT USED TO BE AN OVERLAY, WHICH WAS THE BUG. The detail view was
 * rendered as `fixed inset-0` from inside the events list, so opening an
 * event covered the entire application — sidebar, top bar and all — with
 * something that looked like a modal but behaved like a screen. It had no
 * URL, so it could not be linked to, opened in a tab, refreshed or
 * reached with the back button, and the browser's back button left the
 * list rather than closing it.
 *
 * It is a route now. The shell stays where it is, the address bar says
 * which event you are on, and back goes back.
 */
export default function EventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    // RLS decides this, not the query: an organiser can only read their
    // own rows, so somebody else's event id comes back empty rather than
    // forbidden. Either way there is nothing to show.
    if (error || !data) {
      setState("missing");
      return;
    }
    setEvent(data);
    setState("ready");
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--dl-ink-faint)]" />
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="dl-card mx-auto max-w-md p-8 text-center">
        <p className="text-[16px] font-extrabold tracking-[-0.02em]">
          That event isn&rsquo;t here
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          It may have been deleted, or it belongs to another account.
        </p>
        <button onClick={() => router.push("/events")} className="dl-btn mt-5">
          Back to events
        </button>
      </div>
    );
  }

  return (
    <EventDetailView
      event={event}
      onBack={() => router.push("/events")}
      onChanged={load}
    />
  );
}
