/**
 * The small display decisions an event card makes, in one place.
 *
 * Both the list card and the rail tile need to say when something is on
 * and to pick a colour for an event with no flyer. Two copies of that
 * drifted apart once already — one saying "Sat 12 Sep" while the other
 * said "12/09" — so they live here and neither owns them.
 */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** "Today", "Tomorrow", then "Sat 12 Sep". Time appended when it is set. */
export function whenLabel(
  date: string | null,
  time: string | null,
  now = new Date()
): string {
  if (!date) return "Date to be announced";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Date to be announced";

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);

  const day =
    days === 0 ? "Today"
    : days === 1 ? "Tomorrow"
    : days < 7 ? `This ${DAYS[d.getDay()]}`
    : days < 14 ? `Next ${DAYS[d.getDay()]}`
    : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

  return time ? `${day} at ${time.replace(/:00\b/, "").toLowerCase()}` : day;
}

/** How many days from now, for "this week" style filters. Null when undated. */
export function daysAway(date: string | null, now = new Date()): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
}

/**
 * A stable two-tone pair for an event with no artwork.
 *
 * MOST EVENTS ARRIVE WITHOUT A FLYER, and a discovery page is carried
 * almost entirely by artwork — so what fills that square when there is
 * none decides whether the page looks designed or looks broken. Derived
 * from the id so it never changes between visits.
 */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["#FF6A45", "#7A1F3D"], ["#DDBBF5", "#2B1B4A"], ["#9BE3C0", "#123A2E"],
  ["#B7C4FF", "#1E2352"], ["#FFDE59", "#5A3B00"], ["#FFB3C7", "#4A1230"],
];

export function tintFor(id: string): [string, string] {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 997;
  return PAIRS[n % PAIRS.length] as unknown as [string, string];
}
