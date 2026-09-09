/**
 * The six things you can say about an event without typing.
 *
 * WHY A FIXED LIST. An open reaction field is a public, permanent,
 * unmoderated string attached to somebody else's event — a content
 * problem nobody asked for, on a platform with one person to police it.
 * Six emoji cannot be abused, cannot be misread, and render the same on
 * every phone in Lagos.
 *
 * THE SET IS DUPLICATED IN setup.sql AS A CHECK CONSTRAINT. That is
 * deliberate belt and braces: the database refuses anything else even if
 * a bug or a crafted request gets past the action. If you change this
 * list, change the constraint in PART 16 in the same commit or writes
 * will start failing in production and pass in every test.
 *
 * WHY THESE SIX. They are what people already send in a group chat when
 * a flyer drops — not a survey. 🔥 is the flyer, 😭 is "this is going to
 * finish me", 💃 is "I'm dancing", 🫡 is "I'll be there", 👀 is "I'm
 * watching this", 🐐 is the lineup. Nothing here is a rating, because
 * nobody rates a party.
 */

export const REACTIONS = ["🔥", "😭", "💃", "🫡", "👀", "🐐"] as const;

export type Reaction = (typeof REACTIONS)[number];

/** What each one is for, read out by a screen reader and shown on hover. */
export const REACTION_LABELS: Record<Reaction, string> = {
  "🔥": "This is hot",
  "😭": "This is going to finish me",
  "💃": "I'm dancing",
  "🫡": "I'll be there",
  "👀": "I'm watching this",
  "🐐": "The lineup though",
};

export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}

/** Counts for every emoji, including the ones nobody has tapped. */
export type ReactionCounts = Record<Reaction, number>;

export function emptyCounts(): ReactionCounts {
  return REACTIONS.reduce((acc, emoji) => {
    acc[emoji] = 0;
    return acc;
  }, {} as ReactionCounts);
}

/** How many taps in total, for "23 people reacted". */
export function totalReactions(counts: ReactionCounts): number {
  return REACTIONS.reduce((sum, emoji) => sum + (counts[emoji] || 0), 0);
}
