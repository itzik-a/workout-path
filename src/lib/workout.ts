/* Helpers for workouts: exercise lookup, item naming, defaults, estimates, cleanup. */
import { EXERCISES, type Dose, type Exercise, type Mode, type Variation } from "../data/catalog";
import type { Block, Item, Workout } from "../state/store";
import type { Template } from "../data/templates";
import { formatDose, formatSeconds } from "./format";

/** Short unique id. (crypto.randomUUID needs https, and the dev server runs over plain http on the LAN.) */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** The catalog plus custom exercises that aren't deleted (deleted ones still resolve by id, for history). */
const OFFERED = EXERCISES.filter((e) => !e.retired);

/** What the catalog and the picker list: built-ins that aren't retired + custom ones that aren't deleted. */
export const allExercises = (custom: Exercise[] = []) => {
  const live = custom.filter((e) => !e.deletedAt);
  return live.length ? [...OFFERED, ...live] : OFFERED;
};

export const isCustom = (id: string) => id.startsWith("u-");

export function getExercise(id: string, custom: Exercise[] = []): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id) ?? custom.find((e) => e.id === id);
}

/** An item's exercise, variation and effective mode (`base` is the variation's own, before the item's override). */
export function itemParts(item: Item, custom?: Exercise[]): { ex?: Exercise; v?: Variation; mode: Mode; base: Mode } {
  const ex = getExercise(item.exerciseId, custom);
  const v = ex?.variations?.find((x) => x.id === item.variationId);
  const base = v?.mode ?? ex?.mode ?? "reps";
  return { ex, v, mode: item.mode ?? base, base };
}

/** Default seconds when a reps exercise is switched to timed. */
export const TIMED_DEFAULT_S = 30;

/** Title for an item: "Push up" + "Fingertip", but just "Dead hang" when the variation already says it. */
export function itemTitle(ex: Exercise | undefined, v: Variation | undefined): { main: string; sub?: string } {
  if (!ex) return { main: "Unknown exercise" };
  if (!v) return { main: ex.name };
  if (v.name.toLowerCase().includes(ex.name.toLowerCase())) return { main: v.name };
  return { main: ex.name, sub: v.name };
}

/** Dose fields to copy onto an item. */
export const doseFields = (d: Dose) => ({ reps: d.reps, seconds: d.seconds, minutes: d.minutes, kg: d.kg, repeats: d.repeats, repeatRest: d.repeatRest });

/** Holds per set for an item (1 unless it's an interval hold). */
export const repeatsOf = (it: Pick<Item, "repeats">, mode: Mode) => (mode === "hold" && (it.repeats ?? 0) > 1 ? it.repeats! : 1);

export function newItem(ex: Exercise, rest: number): Item {
  const v = ex.variations?.[0];
  const dose = v?.dose ?? ex.dose;
  return { id: uid(), exerciseId: ex.id, variationId: v?.id, sets: dose.sets, ...doseFields(dose), perSide: ex.perSide, rest };
}

export const restLabel = (s: number) => (s ? `rest ${formatSeconds(s)}` : "no rest");

/** "3 × 12 · rest 60 s" for a single exercise; "12 reps" inside a group (the group sets the rounds). */
export function itemSummary(item: Item, mode: Mode, inGroup: boolean): string {
  const dose = formatDose({ ...item, sets: inGroup ? 1 : item.sets }, mode, item.perSide);
  if (inGroup) return item.rest ? `${dose} · ${restLabel(item.rest)}` : dose;
  return item.sets > 1 ? `${dose} · ${restLabel(item.rest)}` : dose;
}

export const GROUP_LABEL: Record<Block["kind"], string> = { straight: "Exercise", superset: "Superset", circuit: "Circuit" };

export function blockSummary(b: Block): string {
  return `${b.rounds} ${b.rounds === 1 ? "round" : "rounds"} · ${restLabel(b.restBetween)} between`;
}

export const countItems = (w: Workout) => w.blocks.reduce((n, b) => n + b.items.length, 0);

/** Rough length: about 3 s per rep, holds and timed work as set, plus all rests. */
export function estimateMinutes(w: Workout, custom?: Exercise[]): number {
  const work = (it: Item) => {
    const { mode } = itemParts(it, custom);
    const n = repeatsOf(it, mode);
    const one = mode === "reps" ? (it.reps ?? 0) * 3 : mode === "hold" ? n * (it.seconds ?? 0) + (n - 1) * (it.repeatRest ?? 0) : (it.minutes ?? 0) * 60;
    return it.perSide ? one * 2 : one;
  };
  let t = 0;
  w.blocks.forEach((b, bi) => {
    const more = bi < w.blocks.length - 1 ? 1 : 0;
    if (b.kind === "straight") {
      for (const it of b.items) t += it.sets * work(it) + Math.max(0, it.sets - 1 + more) * it.rest;
    } else {
      const round = b.items.reduce((a, it, ii) => a + work(it) + (ii < b.items.length - 1 ? it.rest : 0), 0);
      t += b.rounds * round + Math.max(0, b.rounds - 1 + more) * b.restBetween;
    }
  });
  return Math.round(t / 60);
}

export function workoutSummary(w: Workout, custom?: Exercise[]): string {
  const n = countItems(w);
  if (!n) return "No exercises yet";
  const min = estimateMinutes(w, custom);
  return `${n} ${n === 1 ? "exercise" : "exercises"} · ~${Math.max(1, min)} min`;
}

/** Deep copy with fresh ids. */
export function cloneWorkout(w: Workout, name: string): Workout {
  return {
    id: uid(),
    name,
    updatedAt: Date.now(),
    blocks: w.blocks.map((b) => ({ ...b, id: uid(), items: b.items.map((it) => ({ ...it, id: uid() })) })),
  };
}

/** Keep blocks valid after any edit: no empty blocks, a group of one becomes a single exercise,
    a single-exercise block holds exactly one item. */
export function tidy(w: Workout) {
  const out: Block[] = [];
  for (const b of w.blocks) {
    if (!b.items.length) continue;
    if (b.kind !== "straight" && b.items.length === 1) {
      const it = b.items[0];
      out.push({ ...b, kind: "straight", rounds: 1, items: [{ ...it, sets: b.rounds, rest: b.restBetween || it.rest }] });
    } else if (b.kind === "straight" && b.items.length > 1) {
      b.items.forEach((it, i) => out.push({ ...b, id: i ? uid() : b.id, items: [it] }));
    } else {
      out.push(b);
    }
  }
  w.blocks = out;
}

/** Next default name: Workout A, B, C … */
export function defaultName(taken: string[]): string {
  for (let i = 0; i < 26; i++) {
    const n = `Workout ${String.fromCharCode(65 + i)}`;
    if (!taken.includes(n)) return n;
  }
  return `Workout ${taken.length + 1}`;
}

/** A new workout from a starter template (fresh ids; template doses over catalog defaults). */
export function fromTemplate(t: Template, name: string, restDefault: number): Workout {
  const blocks: Block[] = t.blocks.map((tb) => {
    const items = tb.items.flatMap((ti) => {
      const ex = getExercise(ti.ex);
      if (!ex) return [];
      const v = ti.v ? ex.variations?.find((x) => x.id === ti.v) : ex.variations?.[0];
      const dose = v?.dose ?? ex.dose;
      const item: Item = {
        id: uid(), exerciseId: ex.id, variationId: v?.id,
        sets: ti.sets ?? dose.sets, ...doseFields(dose), perSide: ex.perSide,
        rest: ti.rest ?? (tb.kind === "straight" ? restDefault : 0),
      };
      for (const k of ["reps", "seconds", "minutes", "kg"] as const) if (ti[k] != null) item[k] = ti[k];
      if (ti.timed) { item.mode = "hold"; item.seconds ??= TIMED_DEFAULT_S; }
      return [item];
    });
    return { id: uid(), kind: tb.kind, rounds: tb.rounds ?? 1, restBetween: tb.restBetween ?? 0, items };
  });
  const w: Workout = { id: uid(), name, blocks, updatedAt: Date.now() };
  tidy(w);
  return w;
}
