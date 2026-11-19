/* Suggestions: move up a ladder step, or add a little to the dose, based on the last workouts. */
import type { Exercise, Mode } from "../data/catalog";
import { READY_STREAK, ladderFor, type Ladder } from "../data/progressions";
import type { Item, Session } from "../state/store";
import { doneSets, formatValue, setValue } from "./history";
import { getExercise, itemParts, itemTitle } from "./workout";

/** Results for one exercise + variation, newest workout first. */
function recent(sessions: Session[], exerciseId: string, variationId: string | undefined, mode: Mode) {
  return [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((s) => {
      const all = s.sets.filter((x) => x.exerciseId === exerciseId && (x.variationId ?? undefined) === (variationId ?? undefined));
      const done = all.filter((x) => !x.skipped);
      return { values: done.map((x) => setValue(x, mode)), skipped: all.length > done.length, any: all.length > 0 };
    })
    .filter((r) => r.any);
}

export type Suggestion =
  | { kind: "move-up"; to: string; toName: string; target: number; mode: Mode; key: string; text: string }
  | { kind: "increase"; field: "reps" | "seconds" | "minutes"; to: number; mode: Mode; key: string; text: string };

const fieldFor = (mode: Mode) => (mode === "reps" ? "reps" : mode === "hold" ? "seconds" : "minutes");

/** +1 rep (+2 from 10), +5 s hold (+10 s from a minute), +1 min. */
export function bump(n: number, mode: Mode) {
  if (mode === "reps") return n + (n >= 10 ? 2 : 1);
  if (mode === "hold") return n + (n >= 60 ? 10 : 5);
  return n + 1;
}

export function suggestFor(item: Item, sessions: Session[], custom?: Exercise[]): Suggestion | null {
  const { ex, mode } = itemParts(item, custom);
  if (!ex) return null;
  const hist = recent(sessions, item.exerciseId, item.variationId, mode).slice(0, READY_STREAK);
  if (hist.length < READY_STREAK) return null;

  const ladder = ladderFor(item.exerciseId);
  const step = ladder ? ladder.steps.findIndex((s) => s.v === item.variationId) : -1;
  if (ladder && step >= 0 && step < ladder.steps.length - 1) {
    const target = ladder.steps[step].target;
    if (hist.every((r) => r.values.length && Math.max(...r.values) >= target)) {
      const next = ex.variations?.find((x) => x.id === ladder.steps[step + 1].v);
      if (next) {
        const name = itemTitle(ex, next).sub ?? next.name;
        return { kind: "move-up", to: next.id, toName: name, target, mode, key: `up:${next.id}`, text: `Ready for ${name}` };
      }
    }
  }

  const field = fieldFor(mode);
  const planned = item[field] ?? 0;
  if (!planned) return null;
  if (!hist.every((r) => !r.skipped && r.values.length && r.values.every((x) => x >= planned))) return null;
  const to = bump(planned, mode);
  return { kind: "increase", field, to, mode, key: `inc:${field}:${to}`, text: `Ready for ${formatValue(to, mode)}` };
}

/** Suggestion unless the user said "Not now" to this exact one. */
export const activeSuggestion = (item: Item, sessions: Session[], custom?: Exercise[]) => {
  const s = suggestFor(item, sessions, custom);
  return s && s.key !== item.skipSuggest ? s : null;
};

export interface LadderRow { v: string; name: string; target: number; mode: Mode; best: number; current: boolean; done: boolean }

/** A ladder with my best at each step; "current" is the hardest step I've logged (or the first). */
export function ladderRows(exerciseId: string, sessions: Session[], custom?: Exercise[]): { ladder: Ladder; rows: LadderRow[]; ready: boolean } | null {
  const ladder = ladderFor(exerciseId);
  const ex = getExercise(exerciseId, custom);
  if (!ladder || !ex) return null;
  const rows = ladder.steps.map((st) => {
    const v = ex.variations?.find((x) => x.id === st.v);
    const mode = v?.mode ?? ex.mode;
    const best = Math.max(0, ...sessions.flatMap((s) => doneSets(s).filter((x) => x.exerciseId === exerciseId && x.variationId === st.v).map((x) => setValue(x, mode))));
    return { v: st.v, name: v ? itemTitle(ex, v).sub ?? v.name : st.v, target: st.target, mode, best, current: false, done: false };
  });
  let cur = 0;
  rows.forEach((r, i) => { if (r.best > 0) cur = i; });
  rows.forEach((r, i) => { r.current = i === cur; r.done = i < cur || r.best >= r.target; });
  const curRow = rows[cur];
  const hist = recent(sessions, exerciseId, curRow.v, curRow.mode).slice(0, READY_STREAK);
  const ready = cur < rows.length - 1 && hist.length === READY_STREAK && hist.every((r) => r.values.length && Math.max(...r.values) >= curRow.target);
  return { ladder, rows, ready };
}
