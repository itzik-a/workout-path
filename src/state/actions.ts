/* Every state change goes through here. */
import type { Equipment } from "../data/catalog";
import { cloneWorkout, defaultName, doseFields, getExercise, newItem, tidy, uid } from "../lib/workout";
import { getState, update, type AppState, type Block, type Item, type Session, type Workout } from "./store";

export function toggleEquipment(e: Equipment) {
  update((s) => {
    const has = s.settings.equipment.includes(e);
    s.settings.equipment = has ? s.settings.equipment.filter((x) => x !== e) : [...s.settings.equipment, e];
  });
}

// ── Workouts ──────────────────────────────────────────────────────

export const liveWorkouts = (s: AppState) => s.workouts.filter((w) => !w.deletedAt);

/** Change one workout, then tidy its blocks and stamp it. */
function edit(id: string, fn: (w: Workout, s: AppState) => void) {
  update((s) => {
    const w = s.workouts.find((x) => x.id === id);
    if (!w) return;
    fn(w, s);
    tidy(w);
    w.updatedAt = Date.now();
  });
}

function findItem(w: Workout, itemId: string) {
  for (let bi = 0; bi < w.blocks.length; bi++) {
    const b = w.blocks[bi];
    const ii = b.items.findIndex((x) => x.id === itemId);
    if (ii >= 0) return { b, bi, ii, item: b.items[ii] };
  }
  return null;
}

const single = (item: Item): Block => ({ id: uid(), kind: "straight", rounds: 1, restBetween: 0, items: [item] });

function move<T>(arr: T[], from: number, to: number) {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}

export function createWorkout(): string {
  const id = uid();
  update((s) => {
    s.workouts.push({ id, name: defaultName(liveWorkouts(s).map((w) => w.name)), blocks: [], updatedAt: Date.now() });
  });
  return id;
}

export const renameWorkout = (id: string, name: string) => edit(id, (w) => { w.name = name; });

export function duplicateWorkout(id: string): string | undefined {
  const src = getState().workouts.find((w) => w.id === id);
  if (!src) return;
  const copy = cloneWorkout(src, `${src.name || "Workout"} copy`);
  update((s) => { s.workouts.push(copy); });
  return copy.id;
}

export const deleteWorkout = (id: string) => edit(id, (w) => { w.deletedAt = Date.now(); });

/** Put a workout back exactly as it was (undo). */
export function restoreWorkout(snapshot: Workout) {
  update((s) => {
    const w: Workout = { ...structuredClone(snapshot), updatedAt: Date.now() };
    delete w.deletedAt;
    const i = s.workouts.findIndex((x) => x.id === w.id);
    if (i >= 0) s.workouts[i] = w;
    else s.workouts.push(w);
  });
}

// ── Exercises in a workout ────────────────────────────────────────

/** Add an exercise as its own block (at `index`, default the end) or to the end of group `blockId`. */
export function addExercise(workoutId: string, exerciseId: string, at: { index?: number; blockId?: string } = {}) {
  edit(workoutId, (w, s) => {
    const ex = getExercise(exerciseId, s.customExercises);
    if (!ex) return;
    const item = newItem(ex, s.settings.restDefault);
    const g = at.blockId ? w.blocks.find((b) => b.id === at.blockId) : undefined;
    if (g) {
      if (g.kind === "straight") {
        g.kind = "superset";
        g.rounds = g.items[0].sets;
        g.restBetween = g.items[0].rest || s.settings.restDefault;
        g.items[0].rest = 0;
      } else if (g.kind === "superset" && g.items.length >= 2) {
        g.kind = "circuit";
      }
      item.rest = 0;
      g.items.push(item);
    } else {
      w.blocks.splice(at.index ?? w.blocks.length, 0, single(item));
    }
  });
}

export function updateItem(workoutId: string, itemId: string, patch: Partial<Item>) {
  edit(workoutId, (w) => {
    const f = findItem(w, itemId);
    if (!f) return;
    Object.assign(f.item, patch);
    if (!f.item.kg) delete f.item.kg;
  });
}

/** Switch variation; the dose resets to that variation's default (its mode may differ). */
export function setVariation(workoutId: string, itemId: string, variationId: string) {
  edit(workoutId, (w, s) => {
    const f = findItem(w, itemId);
    if (!f) return;
    const ex = getExercise(f.item.exerciseId, s.customExercises);
    const v = ex?.variations?.find((x) => x.id === variationId);
    if (!ex || !v) return;
    const dose = v.dose ?? ex.dose;
    const kg = f.item.kg;
    delete f.item.reps; delete f.item.seconds; delete f.item.minutes;
    Object.assign(f.item, { variationId, sets: dose.sets, ...doseFields(dose) });
    if (!dose.kg && kg) f.item.kg = kg;
  });
}

export const removeItem = (workoutId: string, itemId: string) =>
  edit(workoutId, (w) => { const f = findItem(w, itemId); if (f) f.b.items.splice(f.ii, 1); });

export function duplicateItem(workoutId: string, itemId: string) {
  edit(workoutId, (w) => {
    const f = findItem(w, itemId);
    if (!f) return;
    const copy = { ...f.item, id: uid() };
    if (f.b.kind === "straight") w.blocks.splice(f.bi + 1, 0, single(copy));
    else f.b.items.splice(f.ii + 1, 0, copy);
  });
}

export const moveBlock = (workoutId: string, from: number, to: number) => edit(workoutId, (w) => move(w.blocks, from, to));

export const moveItem = (workoutId: string, blockId: string, from: number, to: number) =>
  edit(workoutId, (w) => { const b = w.blocks.find((x) => x.id === blockId); if (b) move(b.items, from, to); });

/** Merge a block with the one after it into a superset (2 exercises) or circuit (3+). */
export function groupWithNext(workoutId: string, blockId: string) {
  edit(workoutId, (w, s) => {
    const bi = w.blocks.findIndex((b) => b.id === blockId);
    const a = w.blocks[bi], b = w.blocks[bi + 1];
    if (!a || !b) return;
    const rounds = (x: Block) => (x.kind === "straight" ? x.items[0].sets : x.rounds);
    const restBetween = a.kind === "straight" ? a.items[0].rest || s.settings.restDefault : a.restBetween;
    const items = [...a.items, ...b.items].map((it) => ({ ...it, rest: 0 }));
    a.kind = items.length > 2 || a.kind === "circuit" ? "circuit" : "superset";
    a.rounds = Math.max(rounds(a), rounds(b));
    a.restBetween = restBetween;
    a.items = items;
    w.blocks.splice(bi + 1, 1);
  });
}

/** Split a group back into single exercises, each with the group's rounds as sets. */
export function ungroup(workoutId: string, blockId: string) {
  edit(workoutId, (w, s) => {
    const bi = w.blocks.findIndex((b) => b.id === blockId);
    const g = w.blocks[bi];
    if (!g || g.kind === "straight") return;
    const rest = g.restBetween || s.settings.restDefault;
    w.blocks.splice(bi, 1, ...g.items.map((it) => single({ ...it, sets: g.rounds, rest })));
  });
}

/** Take one exercise out of its group; it lands right after the group. */
export function takeOutOfGroup(workoutId: string, itemId: string) {
  edit(workoutId, (w, s) => {
    const f = findItem(w, itemId);
    if (!f || f.b.kind === "straight") return;
    f.b.items.splice(f.ii, 1);
    w.blocks.splice(f.bi + 1, 0, single({ ...f.item, sets: f.b.rounds, rest: f.b.restBetween || s.settings.restDefault }));
  });
}

export function updateBlock(workoutId: string, blockId: string, patch: Partial<Pick<Block, "kind" | "rounds" | "restBetween">>) {
  edit(workoutId, (w) => { const b = w.blocks.find((x) => x.id === blockId); if (b) Object.assign(b, patch); });
}

export const deleteBlock = (workoutId: string, blockId: string) =>
  edit(workoutId, (w) => { w.blocks = w.blocks.filter((b) => b.id !== blockId); });

// ── Sessions and settings ─────────────────────────────────────────

export const addSession = (session: Session) => update((s) => { s.sessions.push(session); });

export const setBeeps = (on: boolean) => update((s) => { s.settings.beeps = on; });
