"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { feedStatus, listFeed, postToFeed, type FeedPost } from "@/app/actions/feed";

/**
 * The room under the event.
 *
 * READ BY ANYONE, WRITTEN BY TICKET HOLDERS. Somebody who has not bought
 * sees the conversation and a line telling them how to join it — which is
 * the whole snowball: the feed is both the proof that people are coming
 * and a reason to buy.
 *
 * IT RENDERS NOTHING RATHER THAN AN EMPTY BOX. A feed with no posts and
 * no right to post is not a feature, it is a hole in the page. When there
 * is nothing to show and nothing to say, this component disappears.
 */

function when(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function EventFeed({ eventId }: { eventId: string }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    Promise.all([feedStatus(eventId), listFeed(eventId)])
      .then(([status, rows]) => {
        if (!alive) return;
        setEnabled(status.enabled);
        setCanPost(status.canPost);
        setPosts(rows);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [eventId]);

  // Nothing to show and nothing anybody here can do about it.
  if (!loaded || !enabled) return null;
  if (posts.length === 0 && !canPost) return null;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const res = await postToFeed(eventId, text);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDraft("");
      setPosts(await listFeed(eventId));
    });
  };

  return (
    <div className="mt-10 border-t border-[var(--dl-line)] pt-8">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--dl-ink-faint)]">
        The chat
      </h2>

      {canPost ? (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Say something to the room…"
            className="w-full resize-none rounded-2xl border border-[var(--dl-line)] bg-[var(--dl-panel)] px-4 py-3 text-[15px] leading-[1.5] text-[var(--dl-ink)] outline-none placeholder:text-[var(--dl-ink-faint)] focus:border-[var(--coral)]"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={send}
              disabled={pending || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--coral)] px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-45"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send
            </button>
            <span className="text-[12px] text-[var(--dl-ink-faint)]">
              {500 - draft.length} left
            </span>
          </div>
          {error && (
            <p className="mt-2 text-[13px] font-semibold text-[var(--dl-danger)]">{error}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--dl-ink-faint)]">
          Only people with a ticket can post here. Get one and you&rsquo;re in the
          room.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3.5">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--dl-line)] bg-[var(--dl-panel)] text-[12px] font-extrabold">
              {(post.authorName ?? "?").trim().charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[var(--dl-ink-faint)]">
                {post.authorName || "Someone with a ticket"}
                <span className="ml-2 font-semibold">{when(post.createdAt)}</span>
                {post.mine && <span className="ml-2 font-semibold">· you</span>}
              </p>
              <div
                className={`mt-1 inline-block max-w-full rounded-[18px] rounded-tl-[6px] border px-4 py-2.5 ${
                  post.mine
                    ? "border-[rgba(255,222,89,0.45)] bg-[rgba(255,222,89,0.12)]"
                    : "border-[var(--dl-line)] bg-[var(--dl-panel)]"
                }`}
              >
                <p className="whitespace-pre-line break-words text-[15px] leading-[1.5] text-[var(--dl-ink)]">
                  {post.body}
                </p>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && canPost && (
          <p className="text-[13.5px] text-[var(--dl-ink-faint)]">
            Nothing here yet. You have a ticket, so you go first.
          </p>
        )}
      </div>
    </div>
  );
}
