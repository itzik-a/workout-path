/* The workout in progress. Kept in its own localStorage key (not synced), saved on every
   change, so a reload or the app being closed doesn't lose it. */
import { useSyncExternalStore } from "react";
import type { Run } from "../lib/player";

const KEY = "workoutPath.run";

function load(): Run | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    return r && r.v === 1 && Array.isArray(r.steps) ? r : null;
  } catch { return null; }
}

let run: Run | null = load();
const listeners = new Set<() => void>();

export const getRun = () => run;

export function setRun(r: Run | null) {
  run = r;
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch { /* storage full or blocked */ }
  listeners.forEach((l) => l());
}

/** Change the run: copy, mutate, save. */
export function mutateRun(fn: (r: Run) => void) {
  if (!run) return;
  const r = structuredClone(run);
  fn(r);
  setRun(r);
}

export function useRun() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getRun);
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) { run = load(); listeners.forEach((l) => l()); }
});
