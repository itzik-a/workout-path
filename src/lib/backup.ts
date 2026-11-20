/* Backup to a JSON file and back. Import merges (src/lib/merge.ts): nothing on this device is removed. */
import { getState, normalize, replaceState, todayStr, type AppState } from "../state/store";
import { merge, serialize } from "./merge";

export const backupName = () => `workout-path-backup-${todayStr()}.json`;

/** Save the backup: the share sheet on a touch device (Save to Files), a download elsewhere. */
export async function exportBackup(): Promise<"shared" | "downloaded" | "cancelled"> {
  const text = serialize({ app: "workout-path", exportedAt: new Date().toISOString(), ...getState() });
  return saveFile(new File([text], backupName(), { type: "application/json" }));
}

/** Save a file: the share sheet on a touch device (Save to Files), a download elsewhere. */
export async function saveFile(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}

export interface BackupInfo { state: AppState; exportedAt?: string; workouts: number; sessions: number; routines: number }

/** Read a backup file; throws a readable message if it isn't one. */
export async function readBackup(file: File): Promise<BackupInfo> {
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); } catch { throw new Error("That file isn't a Workout Path backup (it isn't JSON)."); }
  const x = raw as Record<string, unknown> | null;
  if (!x || typeof x !== "object" || !Array.isArray(x.workouts) || !Array.isArray(x.sessions)) {
    throw new Error("That file isn't a Workout Path backup.");
  }
  const state = normalize(x);
  return {
    state,
    exportedAt: typeof x.exportedAt === "string" ? x.exportedAt : undefined,
    workouts: state.workouts.filter((w) => !w.deletedAt).length,
    sessions: state.sessions.length,
    routines: state.routines.filter((r) => !r.deletedAt).length,
  };
}

/** Merge a backup into this device; it syncs out like any local change. */
export function importBackup(b: BackupInfo) {
  replaceState(merge(getState(), b.state), { local: true });
}
