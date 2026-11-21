/* The files the Garmin watch app reads (watch/, PLAN.md §10), written into the sync gist next to the sync data.
   The watch downloads raw gist files as plain text (it can't parse JSON from text), so they hold one record per line,
   fields split by tabs. Its download limit is ~14 KB a file, so there's a small index plus one file per workout; the
   index carries a hash per workout and the watch downloads only the ones that changed. Change the format → bump "WP1"
   and the parser in watch/source/Data.mc.

   wpw-index.txt
     WP1  <synced at, ms>
     D    <routine name>  <workout id Mon> … <workout id Sun>     weekly routine ("" = rest day)
     N    <routine name>  <workout id>                             rotation: the next workout
     W    <workout id>  <name>  <minutes>  <hash of its file>  <sport: strength | run | bike | cardio>
   wpw-<workout id>.txt
     WP1  <workout id>
     C    <key>  <cue>                                             an exercise's cue (not written: the watch doesn't show cues)
     X    <name>  <variation>  <mode r|h|t>  <amount>  <side L|R|->  <set>  <sets>  <kg>  <hold i>  <holds>
          <group s|c|->  <in group i>  <of n>  <cue key>           amount = reps (r) or seconds (h, t)
     R    <seconds>  <label>                                       a rest */
import { buildSteps } from "./player";
import { followedRoutines, rotationNext } from "./routine";
import { estimateMinutes, getExercise, itemTitle } from "./workout";
import type { AppState, Workout } from "../state/store";

export const WATCH_PREFIX = "wpw-";
export const WATCH_INDEX = "wpw-index.txt";
const watchFile = (id: string) => `${WATCH_PREFIX}${id}.txt`;

const clean = (s: string | undefined) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();
const n = (v: number | undefined) => (v == null ? "" : String(v));

/** Short text hash (djb2 over UTF-16 code units, hex; the watch recomputes it in Data.mc): the watch compares it to skip workouts it already has. */
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

/** What the watch records it as (watchSport): all spinning = indoor cycling, all running = running, all other
    cardio = cardio training, anything else (incl. mixed) = strength training. */
export function watchSport(w: Workout, s: AppState): "strength" | "run" | "bike" | "cardio" {
  const ids = w.blocks.flatMap((b) => b.items.map((it) => it.exerciseId));
  if (!ids.length) return "strength";
  if (ids.every((id) => id === "spinning")) return "bike";
  if (ids.every((id) => id === "running")) return "run";
  if (ids.every((id) => getExercise(id, s.customExercises)?.section === "cardio")) return "cardio";
  return "strength";
}

export function watchWorkout(w: Workout, s: AppState): string {
  const custom = s.customExercises;
  const body: string[] = [];
  for (const st of buildSteps(w, custom)) {
    if (st.kind === "rest") { body.push(["R", st.seconds, clean(st.label)].join("\t")); continue; }
    const ex = getExercise(st.exerciseId, custom);
    const v = ex?.variations?.find((x) => x.id === st.variationId);
    const t = itemTitle(ex, v);
    const mode = st.mode === "reps" ? "r" : st.mode === "hold" ? "h" : "t";
    const amount = st.mode === "reps" ? st.reps : st.mode === "hold" ? st.seconds : (st.minutes ?? 0) * 60;
    body.push([
      "X", clean(t.main), clean(t.sub), mode, n(amount), st.side === "left" ? "L" : st.side === "right" ? "R" : "-",
      st.set, st.sets, n(st.kg), n(st.rep?.i), n(st.rep?.n),
      st.group ? st.group.kind[0] : "-", n(st.group?.i), n(st.group?.n), "",
    ].join("\t"));
  }
  return [`WP1\t${w.id}`, ...body].join("\n") + "\n";
}

/** Every watch file by name: the index and one per live workout. */
export function watchFiles(s: AppState): Record<string, string> {
  const files: Record<string, string> = {};
  const index = [`WP1\t${s.updatedAt}`];
  for (const r of followedRoutines(s)) {
    if (r.kind === "weekly") {
      index.push(["D", clean(r.name), ...Array.from({ length: 7 }, (_, d) => r.days?.[d] ?? "")].join("\t"));
    } else {
      const nx = rotationNext(s, r);
      if (nx) index.push(["N", clean(r.name), nx.w.id].join("\t"));
    }
  }
  for (const w of s.workouts.filter((x) => !x.deletedAt)) {
    const text = watchWorkout(w, s);
    files[watchFile(w.id)] = text;
    index.push(["W", w.id, clean(w.name), estimateMinutes(w, s.customExercises), hash(text), watchSport(w, s)].join("\t"));
  }
  files[WATCH_INDEX] = index.join("\n") + "\n";
  return files;
}
