/* Cross-device sync through one private GitHub Gist (same pattern as piano-path).

   - The token (classic, `gist` scope only) is pasted once per device and kept in
     localStorage key `workoutPath.gist`. It is never in the code or the repo.
   - Each sync: read the gist, merge with local (src/lib/merge.ts), write back if anything changed.
   - Runs on start, after a local change (2 s after the first, then at most once a minute while editing), when the app comes back into view,
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
  kind: "off" | "busy" | "pending" | "ok" | "error" | "offline";
  /** short, for the pill */
  text: string;
  /** what went wrong, in full (shown in the Sync & backup sheet) */
  detail?: string;
  /** automatic syncs wait until then (GitHub asked us to back off) */
  retryAt?: number;
  last?: number;
  gistId?: string;
  /** GitHub API requests left in this hour's window, from the last response */
  quota?: { remaining: number; limit: number; reset: number };
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
  constructor(
    public status: number,
    /** GitHub's own error message, e.g. "Bad credentials", "API rate limit exceeded for user ID …" */
    public ghMessage: string,
    public headers: Headers,
  ) { super(`GitHub ${status}: ${ghMessage}`); }
}

const num = (h: Headers, name: string) => { const v = h.get(name); return v == null || v === "" ? null : Number(v); };

/** Remember how much of the hourly allowance is left (shared by every app using this GitHub account). */
function noteQuota(h: Headers) {
  const remaining = num(h, "x-ratelimit-remaining"), limit = num(h, "x-ratelimit-limit"), reset = num(h, "x-ratelimit-reset");
  if (remaining != null && limit != null && reset != null) status = { ...status, quota: { remaining, limit, reset: reset * 1000 } };
}

/** One API call. A 304 (gist unchanged since our ETag) is returned, not thrown. */
async function ghFetch(path: string, init: RequestInit = {}, extra: Record<string, string> = {}): Promise<Response> {
  const res = await fetch(API + path, {
    ...init,
    cache: "no-store", // the API sends max-age=60; always read the latest copy
    headers: {
      Authorization: `Bearer ${cfg!.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...extra,
    },
  });
  noteQuota(res.headers);
  if (!res.ok && res.status !== 304) {
    let msg = res.statusText;
    try { msg = (await res.json()).message || msg; } catch { /* not JSON */ }
    throw new HttpError(res.status, msg, res.headers);
  }
  return res;
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await ghFetch(path, init)).json() as Promise<T>;
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

/** The gist as last read or written: its ETag and our file's text. Reads send the ETag
    (If-None-Match); GitHub answers 304 when nothing changed, and a 304 doesn't count
    toward the hourly API limit, so polling an unchanged gist is free. */
let lastRead: { gistId: string; etag: string; text: string } | null = null;

async function readRemote(): Promise<AppState | null> {
  const gistId = cfg!.gistId!;
  const known = lastRead?.gistId === gistId ? lastRead : null;
  const res = await ghFetch(`/gists/${gistId}`, {}, known ? { "If-None-Match": known.etag } : {});
  let text: string;
  if (res.status === 304 && known) {
    text = known.text;
  } else {
    const g = (await res.json()) as Gist;
    const f = g.files[FILE];
    if (!f) { lastRead = null; return null; }
    text = f.content ?? "";
    if (f.truncated && f.raw_url) text = await (await fetch(f.raw_url, { cache: "no-store" })).text();
    const etag = res.headers.get("etag");
    lastRead = etag ? { gistId, etag, text } : null;
  }
  try { return normalize(JSON.parse(text)); } catch { return null; }
}

async function writeRemote(s: AppState) {
  const gistId = cfg!.gistId!;
  const text = serialize(s);
  const res = await ghFetch(`/gists/${gistId}`, { method: "PATCH", body: JSON.stringify({ files: { [FILE]: { content: text } } }) });
  // The reply carries the new version's ETag: the next read is a free 304 unless another device wrote since.
  const etag = res.headers.get("etag");
  lastRead = etag ? { gistId, etag, text } : null;
}

// ── sync loop ─────────────────────────────────────────────────

let chain: Promise<void> = Promise.resolve();
let dirty = false;
let debounce: ReturnType<typeof setTimeout> | undefined;
/** Writes to the gist are batched: at most one per PUSH_GAP_MS while editing (leaving the app or "Sync now" sends right away). */
const PUSH_GAP_MS = 60_000;
let lastPush = 0;
/** Consecutive "slow down" answers without a Retry-After, for doubling the wait. */
let slowDowns = 0;

const hhmm = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Run one sync after any sync already in progress. `manual` (the Sync now button) ignores a back-off. */
export function syncNow(manual = false): Promise<void> {
  const run = () => doSync(manual);
  chain = chain.then(run, run);
  return chain;
}

/** Turn a GitHub error into a short line, a full explanation and, for limits, when to try again. */
function explain(e: HttpError): Pick<SyncStatus, "text" | "detail" | "retryAt"> {
  const said = `GitHub says: "${e.ghMessage}".`;
  const h = e.headers;
  const remaining = num(h, "x-ratelimit-remaining");
  const reset = num(h, "x-ratelimit-reset");
  const retryAfter = num(h, "retry-after");
  const scopes = h.get("x-oauth-scopes");
  if (e.status === 401) {
    return { text: "Sync token rejected", detail: `${said} The token may have expired or been revoked. Disconnect, then connect again with a new token.` };
  }
  if ((e.status === 403 || e.status === 429) && remaining === 0 && reset) {
    const at = reset * 1000;
    const limit = num(h, "x-ratelimit-limit");
    return {
      text: `GitHub limit hit · back at ${hhmm(at)}`,
      detail: `${said} All ${limit ?? ""} GitHub requests for this hour are used up. They're shared by every app using your GitHub account with any token (Piano Path too). Sync starts again by itself at ${hhmm(at)}; everything is saved on this device meanwhile.`,
      retryAt: at,
    };
  }
  if (e.status === 429 || (e.status === 403 && (retryAfter != null || /rate limit|abuse/i.test(e.ghMessage)))) {
    const wait = retryAfter != null ? retryAfter * 1000 : Math.min(15, 2 ** slowDowns) * 60_000;
    if (retryAfter == null) slowDowns++;
    const at = Date.now() + wait;
    return {
      text: `GitHub asked to slow down · retry at ${hhmm(at)}`,
      detail: `${said} This is GitHub's short-term limit on how often an account can write (e.g. many gist updates in a few minutes), not the hourly one. Sync tries again at ${hhmm(at)}; everything is saved on this device meanwhile.`,
      retryAt: at,
    };
  }
  if (e.status === 403 && scopes != null && !scopes.split(",").map((x) => x.trim()).includes("gist")) {
    return {
      text: "Token can't use gists",
      detail: `${said} This token's permissions are: ${scopes || "none"}. Make a classic token with the gist scope, then disconnect and connect again with it.`,
    };
  }
  if (e.status >= 500) return { text: `GitHub is having trouble (${e.status})`, detail: `${said} Sync tries again in a couple of minutes.` };
  return { text: `Sync failed (${e.status})`, detail: said };
}

async function doSync(manual = false) {
  if (!cfg) return;
  if (!manual && status.retryAt && Date.now() < status.retryAt) {
    schedule(status.retryAt - Date.now() + 1000); // keep any change queued for when GitHub lets us back in
    return;
  }
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
    if (!remote || serialize(merged) !== serialize(remote)) { await writeRemote(merged); lastPush = Date.now(); }
    slowDowns = 0;
    setStatus({ kind: "ok", text: "Synced", detail: undefined, retryAt: undefined, last: Date.now() });
  } catch (e) {
    if (wasDirty) dirty = true; // keep the change queued for the next try
    if (e instanceof HttpError) {
      console.warn("[sync]", e.message, Object.fromEntries(e.headers));
      const x = explain(e);
      setStatus({ kind: "error", detail: undefined, retryAt: undefined, ...x });
      if (x.retryAt) schedule(x.retryAt - Date.now() + 1000);
    } else {
      console.warn("[sync]", e);
      setStatus({ kind: "offline", text: "Can't reach GitHub · saved here", retryAt: undefined, detail: "Couldn't reach api.github.com (offline, or the connection dropped). Changes are saved on this device and sync when it's reachable again." });
    }
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
    if (status.retryAt && Date.now() < status.retryAt) { schedule(status.retryAt - Date.now() + 1000); return; } // keep the limit message up
    // First change syncs after 2 s; while editing, at most one write a minute (each write counts toward GitHub's limit).
    setStatus({ kind: "pending", text: "Saved here · syncing soon" });
    schedule(Math.max(2000, lastPush + PUSH_GAP_MS - Date.now()));
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
  setStatus({ kind: "off", text: "On this device", last: undefined, detail: undefined, retryAt: undefined, quota: undefined });
}
