/* Every state change goes through here. */
import type { Equipment, Exercise } from "../data/catalog";
import { cloneWorkout, defaultName, doseFields, fromTemplate, getExercise, newItem, tidy, uid } from "../lib/workout";
import type { Template } from "../data/templates";
import { activeRoutine, liveRoutines, rotationNext } from "../lib/routine";
import { getState, update, type AppState, type Block, type Item, type Routine, type Session, type Workout } from "./store";

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

/** New workout from a starter template; returns its id. */
export function createFromTemplate(t: Template): string {
  const s0 = getState();
  const taken = new Set(liveWorkouts(s0).map((w) => w.name));
  let name = t.name;
  for (let n = 2; taken.has(name); n++) name = `${t.name} ${n}`;
  const w = fromTemplate(t, name, s0.settings.restDefault);
  update((s) => { s.workouts.push(w); });
  return w.id;
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

/** Save a finished workout. If it was the active rotation's next workout and at least one set was done, the rotation moves on. */
export function addSession(session: Session) {
  update((s) => {
    s.sessions.push(session);
    const r = activeRoutine(s);
    if (r?.kind === "rotation" && session.sets.some((x) => !x.skipped)) {
      const nx = rotationNext(s, r);
      if (nx && nx.w.id === session.workoutId) { r.pos = (nx.i + 1) % (r.order?.length || 1); r.updatedAt = Date.now(); }
    }
  });
}

export const setBeeps = (on: boolean) => update((s) => { s.settings.beeps = on; });

// ── Routines ──────────────────────────────────────────────────────

function editRoutine(id: string, fn: (r: Routine, s: AppState) => void) {
  update((s) => {
    const r = s.routines.find((x) => x.id === id);
    if (!r) return;
    fn(r, s);
    r.updatedAt = Date.now();
  });
}

/** New weekly routine; it becomes the one followed if none is. */
export function createRoutine(): string {
  const id = uid();
  update((s) => {
    const n = liveRoutines(s).length;
    s.routines.push({ id, name: n ? `Routine ${n + 1}` : "My routine", kind: "weekly", days: Array(7).fill(null), order: [], pos: 0, updatedAt: Date.now() });
    if (!activeRoutine(s)) s.activeRoutine = id;
  });
  return id;
}

export const renameRoutine = (id: string, name: string) => editRoutine(id, (r) => { r.name = name; });
export const setRoutineKind = (id: string, kind: Routine["kind"]) => editRoutine(id, (r) => { r.kind = kind; });

export const setRoutineDay = (id: string, day: number, workoutId: string | null) =>
  editRoutine(id, (r) => { const days = r.days?.length === 7 ? r.days : Array(7).fill(null); days[day] = workoutId; r.days = days; });

export const addToRotation = (id: string, workoutId: string) =>
  editRoutine(id, (r) => { r.order = [...(r.order ?? []), workoutId]; });

export function removeFromRotation(id: string, i: number) {
  editRoutine(id, (r) => {
    const order = r.order ?? [];
    order.splice(i, 1);
    const pos = r.pos ?? 0;
    r.pos = order.length ? (i < pos ? pos - 1 : pos) % order.length : 0;
  });
}

/** Reorder; the "next" marker stays on the same workout. */
export function moveInRotation(id: string, from: number, to: number) {
  editRoutine(id, (r) => {
    const order = r.order ?? [];
    if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    const [x] = order.splice(from, 1);
    order.splice(to, 0, x);
    const pos = r.pos ?? 0;
    if (from === pos) r.pos = to;
    else if (from < pos && to >= pos) r.pos = pos - 1;
    else if (from > pos && to <= pos) r.pos = pos + 1;
  });
}

export const setRotationNext = (id: string, i: number) =>
  editRoutine(id, (r) => { const n = r.order?.length ?? 0; r.pos = n ? ((i % n) + n) % n : 0; });

export const setActiveRoutine = (id: string | undefined) => update((s) => { s.activeRoutine = id; });

export function duplicateRoutine(id: string): string | undefined {
  const src = getState().routines.find((r) => r.id === id);
  if (!src) return;
  const copy: Routine = { ...structuredClone(src), id: uid(), name: `${src.name || "Routine"} copy`, updatedAt: Date.now() };
  delete copy.deletedAt;
  update((s) => { s.routines.push(copy); });
  return copy.id;
}

export function deleteRoutine(id: string) {
  update((s) => {
    const r = s.routines.find((x) => x.id === id);
    if (!r) return;
    r.deletedAt = Date.now();
    r.updatedAt = Date.now();
    if (s.activeRoutine === id) s.activeRoutine = undefined;
  });
}

export function restoreRoutine(snapshot: Routine, wasActive: boolean) {
  update((s) => {
    const r: Routine = { ...structuredClone(snapshot), updatedAt: Date.now() };
    delete r.deletedAt;
    const i = s.routines.findIndex((x) => x.id === r.id);
    if (i >= 0) s.routines[i] = r; else s.routines.push(r);
    if (wasActive) s.activeRoutine = r.id;
  });
}

/** Delete a saved workout; its id is kept in `sessionsDeleted` so the delete sticks after sync. */
export function deleteSession(id: string) {
  update((s) => {
    s.sessions = s.sessions.filter((x) => x.id !== id);
    s.sessionsDeleted = [...s.sessionsDeleted.filter((t) => t.id !== id), { id, at: Date.now() }].slice(-1000);
  });
}

export function restoreSession(session: Session) {
  update((s) => {
    s.sessionsDeleted = s.sessionsDeleted.filter((t) => t.id !== session.id);
    if (!s.sessions.some((x) => x.id === session.id)) s.sessions.push({ ...structuredClone(session), updatedAt: Date.now() });
  });
}

export function updateSession(id: string, patch: Partial<Pick<Session, "note" | "rpe">>) {
  update((s) => {
    const x = s.sessions.find((y) => y.id === id);
    if (!x) return;
    Object.assign(x, patch, { updatedAt: Date.now() });
    if (!x.note) delete x.note;
    if (!x.rpe) delete x.rpe;
  });
}

// ── Custom exercises ──────────────────────────────────────────────

/** Create or update a custom exercise (id `u-…`). Returns its id. */
export function saveCustomExercise(ex: Exercise): string {
  const id = ex.id || `u-${uid()}`;
  update((s) => {
    const next: Exercise = { ...structuredClone(ex), id, updatedAt: Date.now() };
    delete next.deletedAt;
    const i = s.customExercises.findIndex((x) => x.id === id);
    if (i >= 0) s.customExercises[i] = next; else s.customExercises.push(next);
  });
  return id;
}

export function deleteCustomExercise(id: string) {
  update((s) => {
    const x = s.customExercises.find((e) => e.id === id);
    if (x) { x.deletedAt = Date.now(); x.updatedAt = Date.now(); }
  });
}

export const restoreCustomExercise = (snapshot: Exercise) => { saveCustomExercise(snapshot); };

// ── My notes and links (any exercise) ─────────────────────────────

function editNote(id: string, fn: (n: NonNullable<AppState["exerciseNotes"][string]>) => void) {
  update((s) => {
    const n = s.exerciseNotes[id] ?? { updatedAt: 0 };
    fn(n);
    n.updatedAt = Date.now();
    s.exerciseNotes[id] = n;
  });
}

export const setExerciseNote = (id: string, note: string) => editNote(id, (n) => { n.note = note.trim() || undefined; });

export const addExerciseLink = (id: string, url: string, label?: string) =>
  editNote(id, (n) => { n.links = [...(n.links ?? []), { url, ...(label?.trim() ? { label: label.trim() } : {}) }]; });

export const removeExerciseLink = (id: string, i: number) =>
  editNote(id, (n) => { n.links = (n.links ?? []).filter((_, k) => k !== i); });
