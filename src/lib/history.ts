/* History: stats, logged exercises, and the series behind the progress charts. */
import type { Exercise, Mode } from "../data/catalog";
import type { Session, SetLog } from "../state/store";
import { formatSeconds } from "./format";
import { dateStr, weekStart, weekday } from "./routine";
import { getExercise, itemTitle } from "./workout";

export const doneSets = (s: Session) => s.sets.filter((x) => !x.skipped);
export const sessionMs = (s: Session) => (s.endedAt ? s.endedAt - s.startedAt : 0);
export const newestFirst = (ss: Session[]) => [...ss].sort((a, b) => b.startedAt - a.startedAt);

export function setMode(x: SetLog, custom?: Exercise[]): Mode {
  if (x.mode) return x.mode;
  const ex = getExercise(x.exerciseId, custom);
  return ex?.variations?.find((v) => v.id === x.variationId)?.mode ?? ex?.mode ?? "reps";
}

export const setValue = (x: SetLog, mode: Mode) => (mode === "reps" ? x.reps ?? 0 : mode === "hold" ? x.seconds ?? 0 : x.minutes ?? 0);

/** "12 reps", "45 s", "20 min" */
export function formatValue(v: number, mode: Mode): string {
  if (mode === "reps") return `${v} ${v === 1 ? "rep" : "reps"}`;
  if (mode === "hold") return formatSeconds(Math.round(v));
  return `${Math.round(v * 10) / 10} min`;
}

/** Local date of the first day of this week (device region's week start). */
export function weekStartDate(now = new Date()): Date {
  const back = (weekday(now) - weekStart() + 7) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
}

export function periodStats(sessions: Session[], now = new Date()) {
  const sum = (list: Session[]) => ({ n: list.length, ms: list.reduce((a, s) => a + sessionMs(s), 0) });
  const week = dateStr(weekStartDate(now));
  const d30 = dateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  return {
    week: sum(sessions.filter((s) => s.date >= week)),
    last30: sum(sessions.filter((s) => s.date >= d30)),
    total: sum(sessions),
  };
}

export interface Logged { id: string; name: string; sessions: number; last: Session; sets: number }

/** Every exercise with at least one done set, most recently done first. */
export function loggedExercises(sessions: Session[], custom?: Exercise[]): Logged[] {
  const map = new Map<string, Logged>();
  for (const s of newestFirst(sessions)) {
    const seen = new Set<string>();
    for (const x of doneSets(s)) {
      let e = map.get(x.exerciseId);
      if (!e) { e = { id: x.exerciseId, name: getExercise(x.exerciseId, custom)?.name ?? "Unknown exercise", sessions: 0, last: s, sets: 0 }; map.set(x.exerciseId, e); }
      e.sets++;
      if (!seen.has(x.exerciseId)) { seen.add(x.exerciseId); e.sessions++; }
    }
  }
  return [...map.values()];
}

/** One chartable line: all variations together (when they share a mode) or one variation
    (its timed sets, from an item that made a reps exercise timed, are a line of their own: `override`). */
export interface Track { key: string; label: string; mode: Mode; variationId?: string | null; override?: Mode | null }

export function tracksFor(exerciseId: string, sessions: Session[], custom?: Exercise[]): Track[] {
  const ex = getExercise(exerciseId, custom);
  const byVar = new Map<string, { vid: string; override: Mode | null; mode: Mode; n: number }>();
  for (const s of sessions) for (const x of doneSets(s)) {
    if (x.exerciseId !== exerciseId) continue;
    const k = `${x.variationId ?? ""}@${x.mode ?? ""}`;
    const e = byVar.get(k) ?? { vid: x.variationId ?? "", override: x.mode ?? null, mode: setMode(x, custom), n: 0 };
    e.n++;
    byVar.set(k, e);
  }
  const vars = [...byVar.values()].sort((a, b) => b.n - a.n).map(({ vid, override, mode }): Track => {
    const v = ex?.variations?.find((y) => y.id === vid);
    const label = v ? itemTitle(ex, v).sub ?? v.name : ex?.name ?? "Exercise";
    return { key: `${vid || "-"}${override ? `@${override}` : ""}`, label: override ? `${label} (timed)` : label, mode, variationId: vid || null, override };
  });
  const modes = new Set(vars.map((t) => t.mode));
  if (vars.length > 1 && modes.size === 1) return [{ key: "all", label: "All variations", mode: vars[0].mode }, ...vars];
  return vars;
}

export interface Point { id: string; t: number; date: string; best: number; total: number; kg: number; sets: SetLog[] }

/** Per workout, oldest first: best set, total (sum of sets), heaviest weight. */
export function seriesFor(exerciseId: string, track: Track, sessions: Session[]): Point[] {
  const out: Point[] = [];
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const sets = doneSets(s).filter((x) => x.exerciseId === exerciseId && (track.variationId === undefined
      || (x.variationId ?? null) === track.variationId && (x.mode ?? null) === (track.override ?? null)));
    if (!sets.length) continue;
    const vals = sets.map((x) => setValue(x, track.mode));
    out.push({ id: s.id, t: s.startedAt, date: s.date, best: Math.max(...vals), total: vals.reduce((a, b) => a + b, 0), kg: Math.max(0, ...sets.map((x) => x.kg ?? 0)), sets });
  }
  return out;
}

/** "12 Nov" */
export const shortDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** "Thursday, 19 November 2026" */
export const longDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
