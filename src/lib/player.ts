/* Player engine. A workout is flattened into steps (work and rest) when it starts.
   Timers are timestamps (endsAt), never counted intervals, so they stay right when the
   phone locks or the tab sleeps; catchUp() replays anything that ended meanwhile.
   All functions mutate the Run passed in (callers pass a copy). */
import type { Mode } from "../data/catalog";
import type { Exercise } from "../data/catalog";
import type { SetLog, Workout } from "../state/store";
import { itemParts } from "./workout";

export interface WorkStep {
  kind: "work";
  itemId: string;
  exerciseId: string;
  variationId?: string;
  mode: Mode;
  reps?: number;
  seconds?: number;
  minutes?: number;
  kg?: number;
  side?: "left" | "right";
  /** set number (single exercise) or round number (group) */
  set: number;
  sets: number;
  group?: { kind: "superset" | "circuit"; i: number; n: number };
}
export interface RestStep { kind: "rest"; seconds: number; label: string }
export type Step = WorkStep | RestStep;

/** All in ms. `left` is set while paused. The first `lead` ms are a get-ready countdown. */
export interface Timer { endsAt: number; dur: number; lead: number; left?: number }

export interface Run {
  v: 1;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  steps: Step[];
  /** current step */
  i: number;
  timer: Timer | null;
  /** logged sets, by step index */
  logs: Record<number, SetLog>;
  /** reps counter for the current reps step */
  reps?: number;
  done?: boolean;
  endedAt?: number;
}

export const SWITCH_SIDES_S = 5;
export const LEAD_MS = 3000;
/** Get-ready time when a timed set follows another set with no rest in between. */
export const AUTO_LEAD_MS = 5000;

export function buildSteps(w: Workout, custom?: Exercise[]): Step[] {
  const steps: Step[] = [];
  const rest = (seconds: number, label: string) => { if (seconds > 0) steps.push({ kind: "rest", seconds, label }); };
  w.blocks.forEach((b, bi) => {
    const lastBlock = bi === w.blocks.length - 1;
    const work = (it: (typeof b.items)[number], set: number, sets: number, group?: WorkStep["group"]) => {
      const { mode } = itemParts(it, custom);
      const sides = it.perSide ? (["left", "right"] as const) : [undefined];
      sides.forEach((side, si) => {
        if (si && mode !== "reps") rest(SWITCH_SIDES_S, "Switch sides");
        steps.push({
          kind: "work", itemId: it.id, exerciseId: it.exerciseId, variationId: it.variationId, mode,
          reps: it.reps, seconds: it.seconds, minutes: it.minutes, kg: it.kg, side, set, sets, group,
        });
      });
    };
    if (b.kind === "straight") {
      const it = b.items[0];
      for (let s = 1; s <= it.sets; s++) {
        work(it, s, it.sets);
        if (s < it.sets) rest(it.rest, "Rest");
      }
      if (!lastBlock) rest(it.rest, "Rest");
    } else {
      for (let r = 1; r <= b.rounds; r++) {
        b.items.forEach((it, ii) => {
          work(it, r, b.rounds, { kind: b.kind as "superset" | "circuit", i: ii + 1, n: b.items.length });
          if (ii < b.items.length - 1) rest(it.rest, "Rest");
        });
        if (r < b.rounds) rest(b.restBetween, "Rest between rounds");
      }
      if (!lastBlock) rest(b.restBetween, "Rest");
    }
  });
  return steps;
}

export const workMs = (s: WorkStep) => (s.mode === "hold" ? (s.seconds ?? 0) : s.mode === "time" ? (s.minutes ?? 0) * 60 : 0) * 1000;
export const current = (r: Run): Step | undefined => r.steps[r.i];
export const remaining = (t: Timer, now: number) => Math.max(0, t.left ?? t.endsAt - now);

/** Where a timer is: the get-ready lead-in (whole seconds left) or the set/rest itself (ms left). */
export function phaseOf(t: Timer, now: number): { lead: true; sec: number } | { lead: false; ms: number; frac: number } {
  const rem = remaining(t, now);
  if (rem > t.dur) return { lead: true, sec: Math.ceil((rem - t.dur) / 1000) };
  return { lead: false, ms: rem, frac: t.dur ? rem / t.dur : 0 };
}

export function newRun(w: Workout, steps: Step[], now: number): Run {
  const r: Run = { v: 1, workoutId: w.id, workoutName: w.name, startedAt: now, steps, i: 0, timer: null, logs: {} };
  enter(r, 0, now, "manual");
  return r;
}

type How = "manual" | "after-rest" | "after-work";

/** Move to step i. Rests always start; a timed set starts by itself only when it follows a timer. */
export function enter(r: Run, i: number, at: number, how: How) {
  r.i = i;
  r.timer = null;
  delete r.reps;
  if (i >= r.steps.length) { r.done = true; r.endedAt = at; return; }
  const s = r.steps[i];
  if (s.kind === "rest") {
    r.timer = { endsAt: at + s.seconds * 1000, dur: s.seconds * 1000, lead: 0 };
  } else if (s.mode === "reps") {
    r.reps = r.logs[i]?.reps ?? s.reps ?? 0;
  } else if (how !== "manual") {
    const lead = how === "after-rest" ? 0 : AUTO_LEAD_MS;
    const dur = workMs(s);
    r.timer = { endsAt: at + lead + dur, dur, lead };
  }
}

function log(r: Run, i: number, patch: Partial<SetLog>) {
  const s = r.steps[i];
  if (s?.kind !== "work") return;
  const entry: SetLog = { itemId: s.itemId, exerciseId: s.exerciseId, variationId: s.variationId, set: s.set, side: s.side, kg: s.kg, ...patch };
  for (const k of Object.keys(entry) as (keyof SetLog)[]) if (entry[k] === undefined) delete entry[k];
  r.logs[i] = entry;
}

/** Tap Start on a timed set: 3-2-1, then the set. */
export function startSet(r: Run, now: number) {
  const s = current(r);
  if (s?.kind !== "work" || s.mode === "reps" || r.timer) return;
  const dur = workMs(s);
  r.timer = { endsAt: now + LEAD_MS + dur, dur, lead: LEAD_MS };
}

export function pause(r: Run, now: number) {
  if (r.timer && r.timer.left == null) r.timer.left = r.timer.endsAt - now;
}

export function resume(r: Run, now: number) {
  if (r.timer?.left != null) { r.timer.endsAt = now + r.timer.left; delete r.timer.left; }
}

export const addRest = (r: Run, ms: number) => {
  if (!r.timer || current(r)?.kind !== "rest") return;
  r.timer.dur += ms;
  if (r.timer.left != null) r.timer.left += ms; else r.timer.endsAt += ms;
};

/** Done (reps) or End set (timed, logs what was actually done). */
export function finishSet(r: Run, now: number) {
  const s = current(r);
  if (s?.kind !== "work") return;
  if (s.mode === "reps") log(r, r.i, { reps: r.reps ?? s.reps });
  else {
    const t = r.timer;
    const ms = t ? Math.min(t.dur, t.dur - remaining(t, now)) : 0;
    if (ms <= 0) log(r, r.i, { skipped: true });
    else if (s.mode === "hold") log(r, r.i, { seconds: Math.round(ms / 1000) });
    else log(r, r.i, { minutes: Math.round(ms / 6000) / 10 });
  }
  enter(r, r.i + 1, now, "manual");
}

export function skip(r: Run, now: number) {
  if (current(r)?.kind === "work" && !r.logs[r.i]) log(r, r.i, { skipped: true });
  enter(r, r.i + 1, now, "manual");
}

/** Back to the previous set (from a rest: the set just done), to do it again. */
export function back(r: Run, now: number) {
  let j = r.i - 1;
  while (j >= 0 && r.steps[j].kind !== "work") j--;
  enter(r, j < 0 ? r.i : j, now, "manual");
}

/** Apply every timer that has ended by `now`, in order, each at its own end time. */
export function catchUp(r: Run, now: number): { count: number; last?: Step["kind"] } {
  let count = 0;
  let last: Step["kind"] | undefined;
  while (!r.done && r.timer && r.timer.left == null && r.timer.endsAt <= now && count < 1000) {
    const at = r.timer.endsAt;
    const s = current(r)!;
    if (s.kind === "work") log(r, r.i, s.mode === "hold" ? { seconds: s.seconds } : { minutes: s.minutes });
    last = s.kind;
    count++;
    enter(r, r.i + 1, at, s.kind === "rest" ? "after-rest" : "after-work");
  }
  return { count, last };
}

export const loggedSets = (r: Run): SetLog[] =>
  Object.keys(r.logs).map(Number).sort((a, b) => a - b).map((k) => r.logs[k]);

/** "12:05" from ms, rounding up so a countdown shows 0:01 until it really ends. */
export function clock(ms: number, up = true): string {
  const s = up ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}
