/* App state: one object, saved to localStorage on every change.
   Every change goes through src/state/actions.ts. New fields must be
   optional in normalize() so older saved copies still load. */
import { useSyncExternalStore } from "react";
import { HOME_EQUIPMENT, type Equipment, type Exercise } from "../data/catalog";

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
  /** rest after each set, seconds */
  rest: number;
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
}

export interface Settings {
  /** default rest between sets, seconds */
  restDefault: number;
  beeps: boolean;
  theme: "system" | "light" | "dark";
  equipment: Equipment[];
}

export interface AppState {
  v: 1;
  customExercises: Exercise[];
  workouts: Workout[];
  routines: Routine[];
  activeRoutine?: string;
  sessions: Session[];
  /** ids of deleted sessions, so a delete sticks after sync */
  sessionsDeleted: string[];
  settings: Settings;
  updatedAt: number;
}

const LS = "workoutPath.v1";

export const todayStr = () => new Date().toLocaleDateString("en-CA");

export function defaults(): AppState {
  return {
    v: 1,
    customExercises: [],
    workouts: [],
    routines: [],
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
    workouts: arr(x.workouts),
    routines: arr(x.routines),
    activeRoutine: x.activeRoutine,
    sessions: arr(x.sessions),
    sessionsDeleted: arr(x.sessionsDeleted),
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
