/* What runs on connect.garmin.com: pasted into the console (the copied text calls it with the
   data), or from the bookmark (it reads the copied text from the clipboard). It uses the
   requests the Garmin Connect website itself makes (unofficial): the page's CSRF token and
   the signed-in cookies, so it only works there.

   garminRunner is turned into text with toString(), so it must not use anything from
   outside its own body (no imports, no module constants). Bump RUNNER_VERSION and the
   VERSION inside it together whenever the payload or the runner changes: an old bookmark
   then asks to be replaced. */

export const RUNNER_VERSION = 2;

export interface GarminPayload {
  v: number;
  /** every workout made here: also remove the ones made here that aren't in `workouts` */
  all: boolean;
  workouts: { tag: string; name: string; body: unknown }[];
  /** replace this app's calendar entries between from and to (YYYY-MM-DD, inclusive) */
  calendar?: { from: string; to: string; days: { date: string; tag: string }[] };
}

export async function garminRunner(given: GarminPayload | null): Promise<void> {
  const VERSION = 2;
  const say = (m: string) => { console.log("Workout Path:", m); alert("Workout Path: " + m); };
  type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (!/(^|\.)connect\.garmin\.com$/.test(location.hostname) || !csrf) {
    say("open connect.garmin.com, sign in, then try again there.");
    return;
  }
  let data = given;
  if (!data) {
    let text = "";
    try { text = await navigator.clipboard.readText(); } catch { /* not allowed: ask for a paste */ }
    // The copied text holds this runner too (with these markers in it), so the data is
    // between the LAST start marker and the end marker after it.
    const START = "/*WP-DATA*/", END = "/*WP-END*/";
    if (!text.includes(END)) text = prompt("Paste what Workout Path copied (⌘V), then OK.") ?? "";
    const i = text.lastIndexOf(START), j = text.indexOf(END, i);
    if (i < 0 || j < 0) { if (text) say("that isn't from Workout Path. In Workout Path, choose Send to Garmin › Copy, then try again."); return; }
    data = JSON.parse(text.slice(i + START.length, j)) as GarminPayload;
  }
  if (data.v !== VERSION) {
    say("this bookmark is out of date. In Workout Path, open Send to Garmin and drag the new bookmark to the bookmarks bar.");
    return;
  }

  const api = async (method: string, path: string, body?: unknown): Promise<Json | Json[] | null> => {
    const r = await fetch("/gc-api" + path, {
      method, credentials: "include", body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        "Content-Type": "application/json; charset=UTF-8", Accept: "application/json",
        "connect-csrf-token": csrf, "x-requested-with": "XMLHttpRequest",
      },
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
    try { return text ? JSON.parse(text) : null; } catch { return null; }
  };

  const n = { added: 0, updated: 0, removed: 0, planned: 0, unplanned: 0 };
  const ids = new Map<string, number>();
  try {
    // 1. My workouts in Connect that were made here: "(wp:<id>)" in the description.
    const mine = new Map<string, number[]>();
    for (let start = 0; ; start += 100) {
      const page = await api("GET", `/workout-service/workouts?start=${start}&limit=100&myWorkoutsOnly=true`);
      if (!Array.isArray(page)) break;
      for (const w of page) {
        let desc: unknown = w.description;
        if (desc === undefined && w.sportType?.sportTypeKey === "strength_training") {
          desc = ((await api("GET", `/workout-service/workout/${w.workoutId}`)) as Json | null)?.description;
        }
        const m = typeof desc === "string" ? desc.match(/\(wp:([^)\s]+)\)/) : null;
        if (m) mine.set("wp:" + m[1], [...(mine.get("wp:" + m[1]) ?? []), w.workoutId]);
      }
      if (page.length < 100) break;
    }

    // 2. Update the ones sent before (same Garmin id, so calendar entries stay), add the new ones.
    for (const w of data.workouts) {
      const [id, ...copies] = mine.get(w.tag) ?? [];
      if (id) {
        await api("PUT", `/workout-service/workout/${id}`, { ...(w.body as Json), workoutId: id });
        ids.set(w.tag, id);
        n.updated++;
      } else {
        const made = (await api("POST", "/workout-service/workout", w.body)) as Json;
        ids.set(w.tag, made.workoutId);
        n.added++;
      }
      for (const x of copies) { await api("DELETE", `/workout-service/workout/${x}`); n.removed++; }
    }
    // Sending everything: workouts made here that are gone from Workout Path go from Connect too.
    if (data.all) {
      for (const [tag, list] of mine) {
        if (ids.has(tag)) continue;
        for (const x of list) { await api("DELETE", `/workout-service/workout/${x}`); n.removed++; }
      }
    }

    // 3. Calendar: only this app's workouts, only from..to; change what differs.
    const cal = data.calendar;
    if (cal) {
      const ours = new Set(ids.values());
      const names = new Set(data.workouts.map((w) => w.name));
      const have: { id: number; key: string }[] = [];
      let [y, mo] = cal.from.split("-").map(Number);
      const [ty, tm] = cal.to.split("-").map(Number);
      while (y < ty || (y === ty && mo <= tm)) {
        const month = (await api("GET", `/calendar-service/year/${y}/month/${mo - 1}`)) as Json | null;
        for (const it of (month?.calendarItems ?? []) as Json[]) {
          if (it.itemType !== "workout" || !(it.date >= cal.from && it.date <= cal.to)) continue;
          const wid = it.workoutId ?? (names.has(it.title) ? -1 : undefined);
          if (wid === -1 || ours.has(wid)) have.push({ id: it.id, key: `${it.date}|${it.workoutId ?? it.title}` });
        }
        if (++mo > 12) { mo = 1; y++; }
      }
      const want = cal.days.map((d) => ({ date: d.date, workoutId: ids.get(d.tag) })).filter((d) => d.workoutId);
      const wantKeys = new Set(want.map((d) => `${d.date}|${d.workoutId}`));
      const haveKeys = new Set(have.map((h) => h.key));
      for (const h of have) {
        if (!wantKeys.has(h.key)) { await api("DELETE", `/workout-service/schedule/${h.id}`); n.unplanned++; }
      }
      for (const d of want) {
        if (!haveKeys.has(`${d.date}|${d.workoutId}`)) { await api("POST", `/workout-service/schedule/${d.workoutId}`, { date: d.date }); n.planned++; }
      }
      // Ask Garmin to push the calendar to the watch now (it also does on the next sync).
      try { await api("PUT", "/workout-service/schedule/sendtodevices"); } catch { /* optional */ }
    }
  } catch (e) {
    console.error("Workout Path:", e);
    say(`stopped: ${(e as Error).message}\n\nDone so far: ${n.added} added, ${n.updated} updated, ${n.removed} removed. Running it again is safe.`);
    return;
  }

  const parts = [
    n.updated && `${n.updated} updated`, n.added && `${n.added} added`, n.removed && `${n.removed} removed`,
  ].filter(Boolean);
  let msg = `workouts in Garmin Connect: ${parts.join(", ") || "nothing to change"}.`;
  if (data.calendar) {
    const c = [n.planned && `${n.planned} added`, n.unplanned && `${n.unplanned} removed`].filter(Boolean);
    msg += `\nCalendar until ${data.calendar.to}: ${c.join(", ") || "already up to date"}.`;
  }
  say(msg + "\n\nThe watch gets it on its next sync with the Garmin Connect app.");
  if (!data.all && data.workouts.length === 1) {
    const id = [...ids.values()][0];
    if (id) location.href = "/modern/workout/" + id;
  }
}

const runnerSource = () => garminRunner.toString();

/** The text to copy: runs in the console as is; the bookmark reads the data between the markers. */
export function garminScript(p: GarminPayload): string {
  const what = p.all ? `all ${p.workouts.length} workouts${p.calendar ? " and the calendar" : ""}` : `"${p.workouts[0]?.name ?? "workout"}"`;
  return `// Workout Path → Garmin Connect: sends ${what}. Paste on connect.garmin.com, or use the Workout Path bookmark there.\n` +
    `(${runnerSource()})(/*WP-DATA*/${JSON.stringify(p)}/*WP-END*/);\n`;
}

/** The bookmark: the same runner, reading the copied text from the clipboard. */
export const garminBookmarklet = () => "javascript:" + encodeURIComponent(`void (${runnerSource()})(null)`);
