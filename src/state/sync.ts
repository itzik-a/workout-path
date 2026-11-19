/* Cross-device sync through one private GitHub Gist (same pattern as piano-path).

   - The token (classic, `gist` scope only) is pasted once per device and kept in
     localStorage key `workoutPath.gist`. It is never in the code or the repo.
   - Each sync: read the gist, merge with local (src/lib/merge.ts), write back if anything changed.
   - Runs on start, ~2 s after a local change, when the app comes back into view,
     when the network returns, and every 2 minutes while visible.
   - The workout in progress (workoutPath.run) is not synced. */
import { useSyncExternalStore } from "react";
import { merge, serialize } from "../lib/merge";
import { getState, normalize, onLocalChange, replaceState, type AppState } from "./store";

const CFG_KEY = "workoutPath.gist";
const FILE = "workout-path.json";
const DESC = "Workout Path sync data (written by the app)";
const API = "https://api.github.com";

export const TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=gist&description=" + encodeURIComponent("Workout Path sync");

interface Cfg { token: string; gistId?: string }

export interface SyncStatus {
  kind: "off" | "busy" | "ok" | "error" | "offline";
  text: string;
  last?: number;
  gistId?: string;
}

// ── status store ──────────────────────────────────────────────

let cfg: Cfg | null = loadCfg();
let status: SyncStatus = cfg ? { kind: "busy", text: "Connecting…" } : { kind: "off", text: "On this device" };
const listeners = new Set<() => void>();

function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s, gistId: cfg?.gistId };
  listeners.forEach((l) => l());
}

export function useSyncStatus() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => status);
}

function loadCfg(): Cfg | null {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    return c && typeof c.token === "string" ? c : null;
  } catch { return null; }
}

function saveCfg() {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CFG_KEY);
}

// ── GitHub API ────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    cache: "no-store", // the API sends max-age=60; always read the latest copy
    headers: {
      Authorization: `Bearer ${cfg!.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new HttpError(res.status, `GitHub ${res.status}`);
  return res.json() as Promise<T>;
}

interface GistFile { content?: string; truncated?: boolean; raw_url?: string }
interface Gist { id: string; files: Record<string, GistFile | undefined> }

/** The gist that holds FILE, found by filename (so every device finds the same one), or a new private one. */
async function findOrCreateGist(): Promise<string> {
  for (let page = 1; page <= 10; page++) {
    const list = await gh<Gist[]>(`/gists?per_page=100&page=${page}`);
    const hit = list.find((g) => g.files[FILE]);
    if (hit) return hit.id;
    if (list.length < 100) break;
  }
  const g = await gh<Gist>("/gists", {
    method: "POST",
    body: JSON.stringify({ description: DESC, public: false, files: { [FILE]: { content: serialize(getState()) } } }),
  });
  return g.id;
}

async function readRemote(): Promise<AppState | null> {
  const g = await gh<Gist>(`/gists/${cfg!.gistId}`);
  const f = g.files[FILE];
  if (!f) return null;
  let text = f.content ?? "";
  if (f.truncated && f.raw_url) text = await (await fetch(f.raw_url, { cache: "no-store" })).text();
  try { return normalize(JSON.parse(text)); } catch { return null; }
}

async function writeRemote(s: AppState) {
  await gh(`/gists/${cfg!.gistId}`, { method: "PATCH", body: JSON.stringify({ files: { [FILE]: { content: serialize(s) } } }) });
}

// ── sync loop ─────────────────────────────────────────────────

let chain: Promise<void> = Promise.resolve();
let dirty = false;
let debounce: ReturnType<typeof setTimeout> | undefined;

/** Run one sync after any sync already in progress. */
export function syncNow(): Promise<void> {
  chain = chain.then(doSync, doSync);
  return chain;
}

async function doSync() {
  if (!cfg) return;
  if (!navigator.onLine) { setStatus({ kind: "offline", text: "Offline · saved here" }); return; }
  setStatus({ kind: "busy", text: "Syncing…" });
  const wasDirty = dirty;
  dirty = false;
  try {
    if (!cfg.gistId) { cfg.gistId = await findOrCreateGist(); saveCfg(); }
    let remote: AppState | null;
    try {
      remote = await readRemote();
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) { // the gist was deleted: find or start another
        cfg.gistId = undefined; saveCfg();
        cfg.gistId = await findOrCreateGist(); saveCfg();
        remote = await readRemote();
      } else throw e;
    }
    const local = getState();
    const merged = remote ? merge(local, remote) : local;
    if (serialize(merged) !== serialize(local)) replaceState(merged);
    if (!remote || serialize(merged) !== serialize(remote)) await writeRemote(merged);
    setStatus({ kind: "ok", text: "Synced", last: Date.now() });
  } catch (e) {
    if (wasDirty) dirty = true; // keep the change queued for the next try
    if (e instanceof HttpError && e.status === 401) setStatus({ kind: "error", text: "Sync token rejected" });
    else if (e instanceof HttpError && (e.status === 403 || e.status === 429)) setStatus({ kind: "error", text: "GitHub limit hit · retrying later" });
    else if (e instanceof HttpError) setStatus({ kind: "error", text: `Sync failed (${e.status})` });
    else setStatus({ kind: "offline", text: "Can't reach GitHub · saved here" });
  }
}

function schedule(ms: number) {
  clearTimeout(debounce);
  debounce = setTimeout(() => { void syncNow(); }, ms);
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;

  onLocalChange(() => {
    if (!cfg) return;
    dirty = true;
    setStatus({ kind: "busy", text: "Saving…" });
    schedule(2000);
  });

  document.addEventListener("visibilitychange", () => {
    if (!cfg) return;
    if (document.visibilityState === "hidden") {
      if (dirty) { clearTimeout(debounce); void syncNow(); }
    } else if (dirty || !status.last || Date.now() - status.last > 10_000) {
      void syncNow();
    }
  });
  window.addEventListener("online", () => { if (cfg) void syncNow(); });
  setInterval(() => {
    if (cfg && document.visibilityState === "visible" && status.kind !== "busy") void syncNow();
  }, 120_000);

  if (cfg) void syncNow();
}

/** Connect this device with a token. Resolves when the first sync is done. */
export async function connect(token: string) {
  cfg = { token: token.trim() };
  saveCfg();
  await syncNow();
  if (status.kind === "error" && status.text === "Sync token rejected") {
    disconnect();
    throw new Error("GitHub didn't accept that token. Check it was copied in full and has the gist scope.");
  }
}

export function disconnect() {
  cfg = null;
  saveCfg();
  clearTimeout(debounce);
  dirty = false;
  setStatus({ kind: "off", text: "On this device", last: undefined });
}
