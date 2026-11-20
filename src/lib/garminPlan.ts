/* The Garmin calendar from my followed routines: which workout on which date, for the
   next few weeks. Weekly routines by weekday. A rotation goes on the calendar only when it
   has training days: each training day gets the next workout in order, and the order keeps
   moving on with the calendar, done or not (the watch doesn't tell this app). */
import { dateStr, followedRoutines, liveWorkout, weekday } from "./routine";
import type { AppState, Routine } from "../state/store";

export const CALENDAR_WEEKS = 4;

export interface CalendarPlan {
  from: string;
  to: string;
  days: { date: string; workoutId: string }[];
  /** rotations on the calendar: where each stands today (saved on send) */
  anchors: Record<string, { date: string; pos: number }>;
  /** followed rotations left off the calendar (no training days) */
  skipped: Routine[];
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

/** Training days in [from, to): how far a rotation moved on between two dates. */
function trainDaysBetween(from: Date, to: Date, days: number[]) {
  let n = 0;
  for (let d = from; d < to; d = addDays(d, 1)) if (days.includes(weekday(d))) n++;
  return n;
}

export function calendarPlan(s: AppState, now = new Date(), weeks = CALENDAR_WEEKS): CalendarPlan {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = addDays(today, weeks * 7 - 1);
  const out: CalendarPlan = { from: dateStr(today), to: dateStr(end), days: [], anchors: {}, skipped: [] };
  for (const r of followedRoutines(s)) {
    if (r.kind === "weekly") {
      for (let d = today; d <= end; d = addDays(d, 1)) {
        const w = liveWorkout(s, r.days?.[weekday(d)]);
        if (w) out.days.push({ date: dateStr(d), workoutId: w.id });
      }
      continue;
    }
    const order = r.order ?? [];
    const train = r.trainDays ?? [];
    if (!order.length || !train.length) { if (order.length) out.skipped.push(r); continue; }
    // Where the rotation is today: carried on from the last send, unless "next" was changed since.
    const a = r.garminFrom;
    let pos = r.pos ?? 0;
    if (a && a.pos === pos && parse(a.date) <= today) pos = a.pos + trainDaysBetween(parse(a.date), today, train);
    const n = order.length;
    pos = ((pos % n) + n) % n;
    out.anchors[r.id] = { date: out.from, pos };
    for (let d = today; d <= end; d = addDays(d, 1)) {
      if (!train.includes(weekday(d))) continue;
      // The next workout that still exists (deleted ones are skipped, like Today does).
      for (let k = 0; k < n; k++) {
        const w = liveWorkout(s, order[(pos + k) % n]);
        if (w) { out.days.push({ date: dateStr(d), workoutId: w.id }); pos = (pos + k + 1) % n; break; }
      }
    }
  }
  out.days.sort((x, y) => x.date.localeCompare(y.date));
  return out;
}
