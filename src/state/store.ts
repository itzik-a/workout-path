/* App state: one object, saved to localStorage on every change.
   Every change goes through src/state/actions.ts. New fields must be
   optional in normalize() so older saved copies still load. */
import { useSyncExternalStore } from "react";
import { HOME_EQUIPMENT, type Equipment, type Exercise, type Mode } from "../data/catalog";

export interface Item {
  id: string;
  exerciseId: string;
  variationId?: string;
  sets: number;
  reps?: number;
  seconds?: number;
  minutes?: number;
  kg?: number;
  perSide?: boolean;
  /** this item only: timed (seconds) instead of the exercise's reps, e.g. 20 s of burpees */
  mode?: Mode;
  /** rest after each set, seconds */
  rest: number;
  /** hold / timed items: each set is `repeats` holds (≥ 2) with `repeatRest` seconds between, e.g. 6 × 10 s on / 5 s off */
  repeats?: number;
  repeatRest?: number;
  /** a suggestion the user said "Not now" to (its key), so it stays hidden */
  skipSuggest?: string;
}

export interface Block {
  id: string;
  kind: "straight" | "superset" | "circuit";
  rounds: number;
  /** rest between rounds, seconds */
  restBetween: number;
  items: Item[];
}

export interface Workout {
  id: string;
  name: string;
  blocks: Block[];
  updatedAt: number;
  /** Set instead of removing, so history keeps the name and the delete syncs. */
  deletedAt?: number;
}

export interface Routine {
  id: string;
  name: string;
  kind: "weekly" | "rotation";
  /** weekly: workout id per weekday, 0 = Monday … 6 = Sunday; null = rest day */
  days?: (string | null)[];
  /** rotation: workout ids in order (a workout can appear more than once) */
  order?: string[];
  /** rotation: index in `order` of the next workout */
  pos?: number;
  /** rotation: weekdays it's trained on (0 = Monday), so it can go on the Garmin calendar */
  trainDays?: number[];
  /** rotation on the Garmin calendar: on `date` the workout was `order[pos]` (set on each send) */
  garminFrom?: { date: string; pos: number };
  updatedAt: number;
  /** Set instead of removing, like workouts. */
  deletedAt?: number;
}

export interface SetLog {
  itemId: string;
  exerciseId: string;
  variationId?: string;
  set: number;
  side?: "left" | "right";
  reps?: number;
  seconds?: number;
  minutes?: number;
  kg?: number;
  skipped?: boolean;
  /** set when the item overrode the exercise's mode (timed reps), so history reads the right field */
  mode?: Mode;
  /** interval holds: which hold of the set (1-based); each hold is its own log */
  rep?: number;
}

export interface Session {
  id: string;
  workoutId: string;
  /** name at the time, so history reads right after a rename or delete */
  workoutName?: string;
  /** YYYY-MM-DD */
  date: string;
  startedAt: number;
  endedAt?: number;
  sets: SetLog[];
  note?: string;
  rpe?: number;
  /** set when the note / RPE is edited or the session is restored, so sync keeps the newer copy */
  updatedAt?: number;
}

/** A deleted session; `at` lets a later restore (Undo) win over the delete when syncing. */
export interface Tombstone { id: string; at: number }

export interface Settings {
  /** default rest between sets, seconds */
  restDefault: number;
  beeps: boolean;
  theme: "system" | "light" | "dark";
  equipment: Equipment[];
}

/** My own notes and links on any exercise (built-in or custom), keyed by exercise id. */
export interface ExerciseNote {
  note?: string;
  links?: { url: string; label?: string }[];
  updatedAt: number;
}

export interface AppState {
  v: 1;
  customExercises: Exercise[];
  exerciseNotes: Record<string, ExerciseNote>;
  workouts: Workout[];
  routines: Routine[];
  /** routines that show on Today, in the order they were followed */
  following: string[];
  /** before several routines could be followed: the one followed (read by normalize() only) */
  activeRoutine?: string;
  sessions: Session[];
  /** deleted sessions, so a delete sticks after sync */
  sessionsDeleted: Tombstone[];
  settings: Settings;
  updatedAt: number;
}

const LS = "workoutPath.v1";

export const todayStr = () => new Date().toLocaleDateString("en-CA");

export function defaults(): AppState {
  return {
    v: 1,
    customExercises: [],
    exerciseNotes: {},
    workouts: [],
    routines: [],
    following: [],
    sessions: [],
    sessionsDeleted: [],
    settings: { restDefault: 60, beeps: true, theme: "system", equipment: [...HOME_EQUIPMENT] },
    updatedAt: 0,
  };
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function normalize(s: unknown): AppState {
  const d = defaults();
  if (!s || typeof s !== "object") return d;
  const x = s as Partial<AppState>;
  return {
    v: 1,
    customExercises: arr(x.customExercises),
    exerciseNotes: x.exerciseNotes && typeof x.exerciseNotes === "object" ? x.exerciseNotes : {},
    workouts: arr(x.workouts),
    routines: arr(x.routines),
    following: Array.isArray(x.following) ? x.following.filter((id): id is string => typeof id === "string") : x.activeRoutine ? [x.activeRoutine] : [],
    sessions: arr(x.sessions),
    sessionsDeleted: arr<Tombstone | string>(x.sessionsDeleted).map((t) => (typeof t === "string" ? { id: t, at: 0 } : t)),
    settings: { ...d.settings, ...(x.settings || {}) },
    updatedAt: x.updatedAt || 0,
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* fall through */ }
  return defaults();
}

let state: AppState = load();
const listeners = new Set<() => void>();
const localListeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function saveLocal() {
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch { /* storage full or blocked */ }
}

export const getState = () => state;

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Apply a local change: copy, mutate, stamp, save, notify. */
export function update(fn: (draft: AppState) => void) {
  const next = structuredClone(state);
  fn(next);
  next.updatedAt = Date.now();
  state = next;
  saveLocal();
  emit();
  localListeners.forEach((l) => l());
}

/** Called after changes made on this device (not after sync replaces state). */
export function onLocalChange(l: () => void) {
  localListeners.add(l);
  return () => { localListeners.delete(l); };
}

/** Replace state wholesale: sync (a newer copy arrived) or a backup import (`local`, so it syncs out). */
export function replaceState(s: unknown, opts: { local?: boolean } = {}) {
  state = normalize(s);
  saveLocal();
  emit();
  if (opts.local) localListeners.forEach((l) => l());
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getState);
}

/* Keep two open tabs on the same device in step. */
window.addEventListener("storage", (e) => {
  if (e.key === LS && e.newValue) {
    try { state = normalize(JSON.parse(e.newValue)); emit(); } catch { /* ignore */ }
  }
});
