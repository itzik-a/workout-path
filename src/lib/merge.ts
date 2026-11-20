/* Merge two copies of the app state (this device and the gist, or a backup file).
   - workouts, routines, custom exercises: per item, the copy edited last wins
     (deletes are soft, `deletedAt` + `updatedAt`, so they win the same way)
   - sessions: union by id, minus deleted ones; a delete only wins over a session
     not touched after it (so Undo after a sync still restores)
   - notes and links per exercise: the copy edited last wins
   - settings and the followed routines (`following`): from whichever whole copy changed last
   Only type imports here, so the merge can be tested on its own. */
import type { AppState, Session, Tombstone } from "../state/store";

type Stamped = { id: string; updatedAt?: number };

/** Items from both lists; `first` sets the order, others follow. */
function byId<T extends { id: string }>(first: T[], second: T[], pick: (a: T, b: T) => T): T[] {
  const m = new Map<string, T>();
  for (const x of first) m.set(x.id, x);
  for (const y of second) { const x = m.get(y.id); m.set(y.id, x ? pick(x, y) : y); }
  return [...m.values()];
}

const newerItem = <T extends Stamped>(a: T, b: T) => ((b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a);
export const sessionStamp = (s: Session) => s.updatedAt ?? s.endedAt ?? s.startedAt;

/** Per exercise, the note edited last wins. */
function mergeNotes(a: AppState["exerciseNotes"] = {}, b: AppState["exerciseNotes"] = {}) {
  const out = { ...b };
  for (const [k, v] of Object.entries(a)) if (!out[k] || v.updatedAt >= out[k].updatedAt) out[k] = v;
  return out;
}

export function merge(a: AppState, b: AppState): AppState {
  const [newer, older] = a.updatedAt >= b.updatedAt ? [a, b] : [b, a];

  const tomb = new Map<string, number>();
  for (const t of [...older.sessionsDeleted, ...newer.sessionsDeleted]) tomb.set(t.id, Math.max(tomb.get(t.id) ?? 0, t.at));
  const sessions = byId(newer.sessions, older.sessions, (x, y) => (sessionStamp(y) > sessionStamp(x) ? y : x))
    .filter((s) => !(tomb.has(s.id) && tomb.get(s.id)! >= sessionStamp(s)))
    .sort((x, y) => x.startedAt - y.startedAt);
  const sessionsDeleted: Tombstone[] = [...tomb.entries()].map(([id, at]) => ({ id, at })).sort((x, y) => x.at - y.at).slice(-1000);

  return {
    ...structuredClone(newer),
    workouts: structuredClone(byId(newer.workouts, older.workouts, newerItem)),
    routines: structuredClone(byId(newer.routines, older.routines, newerItem)),
    customExercises: structuredClone(byId(newer.customExercises, older.customExercises, newerItem)),
    exerciseNotes: structuredClone(mergeNotes(newer.exerciseNotes, older.exerciseNotes)),
    sessions: structuredClone(sessions),
    sessionsDeleted,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

/** JSON with sorted keys, so equal states always compare (and diff) equal. */
export function serialize(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort)
      : x && typeof x === "object"
        ? Object.fromEntries(Object.keys(x).filter((k) => (x as Record<string, unknown>)[k] !== undefined).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])]))
        : x;
  return JSON.stringify(sort(v), null, 1);
}
