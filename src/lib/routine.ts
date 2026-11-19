/* Routines: which workout is next, week strips, day names. */
import type { AppState, Routine, Session, Workout } from "../state/store";

/** Monday = 0 … Sunday = 6 (how `Routine.days` is stored). */
export const weekday = (d: Date) => (d.getDay() + 6) % 7;

/** First day of the week from the device's region, as a Monday-based index; Monday if unknown. */
export function weekStart(): number {
  try {
    type WeekInfo = { firstDay: number };
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
    const fd = loc.getWeekInfo?.().firstDay ?? loc.weekInfo?.firstDay;
    if (fd) return (fd - 1) % 7; // 1 = Monday … 7 = Sunday
  } catch { /* older browser */ }
  return 0;
}

/** Weekday indexes in display order for this device. */
export const displayDays = () => { const s = weekStart(); return Array.from({ length: 7 }, (_, k) => (s + k) % 7); };

/** Localised weekday name for a Monday-based index (1 Jan 2024 was a Monday). */
export const dayName = (i: number, style: "long" | "short" = "long") =>
  new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: style });

export const dateStr = (d: Date) => d.toLocaleDateString("en-CA");

export const liveWorkout = (s: AppState, id?: string | null): Workout | undefined =>
  id ? s.workouts.find((w) => w.id === id && !w.deletedAt) : undefined;

export const liveRoutines = (s: AppState) => s.routines.filter((r) => !r.deletedAt);

export const activeRoutine = (s: AppState) => liveRoutines(s).find((r) => r.id === s.activeRoutine);

/** The rotation's next workout: `pos`, moved forward past workouts that were deleted. */
export function rotationNext(s: AppState, r: Routine): { i: number; w: Workout } | undefined {
  const order = r.order ?? [];
  const n = order.length;
  if (!n) return;
  const start = (((r.pos ?? 0) % n) + n) % n;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const w = liveWorkout(s, order[i]);
    if (w) return { i, w };
  }
}

export interface TodayPlan {
  routine: Routine;
  /** what to do today (weekly) or next (rotation) */
  workout?: Workout;
  /** weekly: nothing scheduled today */
  rest?: boolean;
  /** a session today for today's workout (weekly) or for any workout in the rotation */
  done?: Session;
  /** weekly: the next scheduled day after today */
  next?: { w: Workout; when: string };
  /** rotation: position of `workout` */
  rotation?: { i: number; n: number };
}

export function todayPlan(s: AppState, now = new Date()): TodayPlan | null {
  const r = activeRoutine(s);
  if (!r) return null;
  const today = s.sessions.filter((x) => x.date === dateStr(now)).sort((a, b) => b.startedAt - a.startedAt);
  if (r.kind === "weekly") {
    const d = weekday(now);
    const days = r.days ?? [];
    const w = liveWorkout(s, days[d]);
    let next: TodayPlan["next"];
    for (let k = 1; k <= 7; k++) {
      const nw = liveWorkout(s, days[(d + k) % 7]);
      if (nw) { next = { w: nw, when: k === 1 ? "Tomorrow" : k === 7 ? `Next ${dayName(d)}` : dayName((d + k) % 7) }; break; }
    }
    return { routine: r, workout: w, rest: !w, done: w ? today.find((x) => x.workoutId === w.id) : undefined, next };
  }
  const nx = rotationNext(s, r);
  const ids = new Set(r.order ?? []);
  return {
    routine: r,
    workout: nx?.w,
    done: today.find((x) => ids.has(x.workoutId)),
    rotation: nx ? { i: nx.i, n: (r.order ?? []).length } : undefined,
  };
}

export interface StripDay { day: number; date: string; label: string; w?: Workout; done: boolean; today: boolean; past: boolean }

/** This week (in display order) for a weekly routine, with what's done. */
export function weekStrip(s: AppState, r: Routine, now = new Date()): StripDay[] {
  const start = weekStart();
  const back = (weekday(now) - start + 7) % 7;
  const today = dateStr(now);
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back + k);
    const day = weekday(d);
    const date = dateStr(d);
    const w = liveWorkout(s, r.days?.[day]);
    const done = s.sessions.some((x) => x.date === date && (w ? x.workoutId === w.id : true));
    return { day, date, label: dayName(day, "short"), w, done, today: date === today, past: date < today };
  });
}

/** "Mon Workout A · Wed Workout B" or "A → B → C". */
export function routineSummary(s: AppState, r: Routine): string {
  if (r.kind === "weekly") {
    const parts = displayDays().map((d) => ({ d, w: liveWorkout(s, r.days?.[d]) })).filter((x) => x.w).map((x) => `${dayName(x.d, "short")} ${x.w!.name || "Untitled"}`);
    return parts.length ? parts.join(" · ") : "Nothing scheduled yet";
  }
  const names = (r.order ?? []).map((id) => liveWorkout(s, id)).filter(Boolean).map((w) => w!.name || "Untitled");
  return names.length ? names.join(" → ") : "No workouts yet";
}

/** "Today", "Yesterday", "Tuesday", or the date. */
export function relativeDay(date: string, now = new Date()): string {
  const [y, m, d] = date.split("-").map(Number);
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(y, m - 1, d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return dayName(weekday(new Date(y, m - 1, d)));
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
