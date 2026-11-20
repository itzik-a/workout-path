/* Garmin export. garminTree() turns a workout into Garmin steps (work, rest, repeats); two
   outputs use it: a FIT workout file (.fit, copied to GARMIN/NewFiles on the watch over USB;
   below, a small encoder with no library) and a Garmin Connect workout
   (src/lib/garminConnect.ts). Exercise codes: src/data/garminCodes.ts. */
import type { Exercise } from "../data/catalog";
import { GARMIN_EXERCISES, garminCode } from "../data/garminCodes";
import type { Item, Workout } from "../state/store";
import { SWITCH_SIDES_S } from "./player";
import { itemParts, itemTitle, repeatsOf } from "./workout";

// ── Workout → Garmin steps ──────────────────────────────────────────
/** Short enough for a watch: no "(…)" asides, and the variation only if it still fits. */
const NAME_FIT = 26;
function stepName(t: { main: string; sub?: string }) {
  const clean = (s: string) => s.replace(/\s*\([^)]*\)/g, "").trim();
  const main = clean(t.main), sub = t.sub && clean(t.sub);
  return sub && main.length + sub.length + 3 <= NAME_FIT ? `${main} · ${sub}` : main;
}

export interface GarminStep {
  kind: "work" | "rest";
  name: string;
  /** reps: a count; time: seconds; open: ends on the lap button */
  end: { reps: number } | { seconds: number } | { open: true };
  /** work: Garmin Connect code, "CATEGORY/EXERCISE" */
  code?: string;
  cue?: string;
  kg?: number;
}
export interface GarminRepeat {
  kind: "repeat";
  times: number;
  /** the last block: no rest after its final round (Garmin Connect only; the FIT file keeps it) */
  skipLastRest: boolean;
  steps: GarminStep[];
}
export type GarminNode = GarminStep | GarminRepeat;

export function garminTree(w: Workout, custom?: Exercise[]): GarminNode[] {
  const out: GarminNode[] = [];
  w.blocks.forEach((b, bi) => {
    const last = bi === w.blocks.length - 1;
    const body: GarminStep[] = [];
    const rest = (s: number, name: string) => { if (s > 0) body.push({ kind: "rest", name, end: { seconds: s } }); };
    const work = (it: Item) => {
      const { ex, v, mode } = itemParts(it, custom);
      const name = stepName(itemTitle(ex, v));
      const end: GarminStep["end"] =
        mode === "reps" ? (it.reps ? { reps: it.reps } : { open: true })
        : mode === "hold" ? (it.seconds ? { seconds: it.seconds } : { open: true })
        : it.minutes ? { seconds: it.minutes * 60 } : { open: true };
      const n = repeatsOf(it, mode);
      const sides = it.perSide ? (["left", "right"] as const) : [undefined];
      sides.forEach((side, si) => {
        if (si && mode !== "reps") rest(SWITCH_SIDES_S, "Switch sides");
        for (let k = 1; k <= n; k++) {
          if (k > 1) rest(it.repeatRest ?? 0, "Short rest");
          body.push({ kind: "work", name: side ? `${name} · ${side}` : name, end, code: garminCode(ex, it.variationId), cue: ex?.cue, kg: it.kg });
        }
      });
    };
    let times: number;
    if (b.kind === "straight") {
      const it = b.items[0];
      work(it);
      rest(it.rest, "Rest"); // after each set; after the last one, the rest before the next exercise
      times = it.sets;
    } else {
      b.items.forEach((it, ii) => { work(it); if (ii < b.items.length - 1) rest(it.rest, "Rest"); });
      rest(b.restBetween, "Rest between rounds");
      times = b.rounds;
    }
    if (times > 1) out.push({ kind: "repeat", times, skipLastRest: last, steps: body });
    else out.push(...(last && body.at(-1)?.kind === "rest" ? body.slice(0, -1) : body));
  });
  return out;
}

/** Rough length in seconds (reps at 3 s each), for Garmin's estimate. */
export function garminSeconds(nodes: GarminNode[]): number {
  const one = (s: GarminStep) => ("seconds" in s.end ? s.end.seconds : "reps" in s.end ? s.end.reps * 3 : 30);
  return nodes.reduce((t, n) => t + (n.kind === "repeat" ? n.times * n.steps.reduce((a, s) => a + one(s), 0) : one(n)), 0);
}

// ── FIT steps (flat: a repeat step points back to its first step) ───
const DUR = { time: 0, open: 5, repeat: 6, reps: 29 } as const;
const INTENSITY = { active: 0, rest: 1 } as const;

interface FitStep {
  name?: string;
  notes?: string;
  durationType: number;
  /** time: ms; reps: count; repeat: index of the first step to repeat */
  durationValue?: number;
  /** repeat: how many times in all */
  repeatTimes?: number;
  intensity?: number;
  /** [FIT exercise category, name] */
  code?: [number, number?];
  kg?: number;
}

export function garminSteps(w: Workout, custom?: Exercise[]): FitStep[] {
  const out: FitStep[] = [];
  const step = (s: GarminStep) => {
    const [durationType, durationValue] =
      "reps" in s.end ? [DUR.reps, s.end.reps] : "seconds" in s.end ? [DUR.time, s.end.seconds * 1000] : [DUR.open, undefined];
    const g = s.code ? GARMIN_EXERCISES[s.code] : undefined;
    out.push({
      name: s.name, notes: s.cue, durationType, durationValue,
      intensity: s.kind === "rest" ? INTENSITY.rest : INTENSITY.active,
      code: g ? [g[1], g[2]] : undefined, kg: s.kg,
    });
  };
  for (const n of garminTree(w, custom)) {
    if (n.kind !== "repeat") { step(n); continue; }
    const from = out.length;
    n.steps.forEach(step);
    out.push({ durationType: DUR.repeat, durationValue: from, repeatTimes: n.times });
  }
  return out;
}

// ── FIT encoding ────────────────────────────────────────────────────
const BT = { enum: 0x00, uint16: 0x84, uint32: 0x86, string: 0x07, uint32z: 0x8c } as const;
type Field = [num: number, type: number, value: number | string | undefined];

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];
function crc16(bytes: Uint8Array, crc = 0) {
  for (const b of bytes) {
    let t = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ t ^ CRC_TABLE[b & 0xf];
    t = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ t ^ CRC_TABLE[(b >> 4) & 0xf];
  }
  return crc;
}

const utf8 = new TextEncoder();
/** UTF-8, cut to `max` bytes without splitting a character, plus the null end. */
function fitString(s: string, max: number): number[] {
  let b = utf8.encode(s.trim());
  if (b.length > max) {
    let n = max;
    while (n > 0 && (b[n] & 0xc0) === 0x80) n--;
    b = b.slice(0, n);
  }
  return [...b, 0];
}

function valueBytes(type: number, v: number | string, max = 64): number[] {
  if (type === BT.string) return fitString(String(v), max);
  const n = Number(v);
  if (type === BT.enum) return [n & 0xff];
  if (type === BT.uint16) return [n & 0xff, (n >>> 8) & 0xff];
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/** Every message gets its own definition (local type 0): simple, and valid FIT. */
function message(out: number[], global: number, fields: Field[], strMax: Record<number, number> = {}) {
  const enc = fields
    .filter(([, , v]) => v !== undefined && v !== "")
    .map(([num, type, v]) => ({ num, type, bytes: valueBytes(type, v!, strMax[num]) }));
  out.push(0x40, 0, 0, global & 0xff, global >> 8, enc.length);
  for (const f of enc) out.push(f.num, f.bytes.length, f.type);
  out.push(0x00);
  for (const f of enc) out.push(...f.bytes);
}

const FIT_EPOCH_S = 631065600; // 1989-12-31 00:00 UTC
const PROFILE_VERSION = 21 * 1000 + 222;

export function workoutFit(w: Workout, custom?: Exercise[], now = Date.now()): Uint8Array {
  const steps = garminSteps(w, custom);
  const data: number[] = [];
  // file_id: a workout file from a "development" manufacturer.
  message(data, 0, [
    [0, BT.enum, 5], [1, BT.uint16, 255], [2, BT.uint16, 0],
    [3, BT.uint32z, (Math.floor(now / 1000) ^ 0x5a5a5a5a) >>> 0 || 1], [4, BT.uint32, Math.floor(now / 1000) - FIT_EPOCH_S],
  ]);
  // workout: training / strength training.
  message(data, 26, [
    [8, BT.string, w.name || "Workout"], [4, BT.enum, 10], [11, BT.enum, 20], [6, BT.uint16, steps.length],
  ], { 8: 40 });
  steps.forEach((s, i) => {
    const repeat = s.durationType === DUR.repeat;
    message(data, 27, [
      [254, BT.uint16, i],
      [0, BT.string, s.name],
      [1, BT.enum, s.durationType],
      [2, BT.uint32, s.durationValue],
      [3, BT.enum, repeat ? undefined : 2], // target: open
      [4, BT.uint32, s.repeatTimes],
      [7, BT.enum, s.intensity],
      [8, BT.string, s.notes],
      [10, BT.uint16, s.code?.[0]],
      [11, BT.uint16, s.code?.[1]],
      [12, BT.uint16, s.kg ? Math.round(s.kg * 100) : undefined],
      [13, BT.uint16, s.kg ? 1 : undefined], // kilogram
    ], { 0: 48, 8: 96 });
  });
  // exercise_title: our name for a Garmin exercise, when only one step name uses that code.
  const names = new Map<string, Set<string>>();
  for (const s of steps) {
    if (s.code?.[1] == null || !s.name) continue;
    const k = `${s.code[0]}:${s.code[1]}`;
    if (!names.has(k)) names.set(k, new Set());
    names.get(k)!.add(s.name.replace(/ · (left|right)$/, ""));
  }
  let ti = 0;
  for (const [k, set] of names) {
    if (set.size !== 1) continue;
    const [cat, name] = k.split(":").map(Number);
    message(data, 264, [[254, BT.uint16, ti++], [0, BT.uint16, cat], [1, BT.uint16, name], [2, BT.string, [...set][0]]], { 2: 48 });
  }

  const header = new Uint8Array(14);
  const dv = new DataView(header.buffer);
  dv.setUint8(0, 14);
  dv.setUint8(1, 0x20);
  dv.setUint16(2, PROFILE_VERSION, true);
  dv.setUint32(4, data.length, true);
  header.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
  dv.setUint16(12, crc16(header.subarray(0, 12)), true);

  const file = new Uint8Array(14 + data.length + 2);
  file.set(header);
  file.set(data, 14);
  const crc = crc16(file.subarray(0, 14 + data.length));
  file[file.length - 2] = crc & 0xff;
  file[file.length - 1] = crc >> 8;
  return file;
}

export const fitFileName = (w: Workout) =>
  `${(w.name || "workout").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "workout"}.fit`;
