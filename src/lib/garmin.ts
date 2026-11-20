/* Export a workout as a Garmin workout file (.fit), so the watch can run it on its own:
   copy the file to GARMIN/NewFiles on the watch over USB. A small FIT encoder (no
   library): file_id, workout, workout_step and exercise_title messages, codes from the
   Garmin FIT SDK profile (21.x). Sets / rounds use Garmin's "repeat" steps, the same
   shape as strength workouts made in Garmin Connect. */
import type { Exercise, SectionId } from "../data/catalog";
import type { Item, Workout } from "../state/store";
import { SWITCH_SIDES_S } from "./player";
import { itemParts, itemTitle, repeatsOf } from "./workout";

// ── Garmin exercise codes ───────────────────────────────────────────
// [category, name]: the name number is per category (FIT profile `<category>ExerciseName`).
// Category only when Garmin has nothing close; the step name still says what it is.
const C = {
  benchPress: 0, cardio: 2, core: 5, crunch: 6, curl: 7, deadlift: 8, hipRaise: 10, hipStability: 11,
  hyperextension: 13, lateralRaise: 14, legCurl: 15, lunge: 17, plank: 19, plyo: 20, pullUp: 21,
  pushUp: 22, shoulderPress: 24, shoulderStability: 25, squat: 28, totalBody: 29, tricepsExtension: 30,
  warmUp: 31, run: 32, bike: 33, move: 35, pose: 36, unknown: 65534,
} as const;

type Code = [category: number, name?: number];

/** Keyed by exercise id, or "exercise:variation" when a variation is a different movement. */
const CODES: Record<string, Code> = {
  "frog-jump": [C.plyo, 37], // jump squat
  "jump-rope": [C.cardio, 6],
  spinning: [C.bike, 0],
  running: [C.run, 0], "running:sprints": [C.run, 3],
  "cat-cow": [C.warmUp, 38],
  "dog-flow": [C.pose, 114], "dog-flow:up-hold": [C.pose, 80], "dog-flow:down-hold": [C.pose, 21],
  "glute-bridge": [C.hipRaise, 11], "glute-bridge:reverse-tabletop": [C.pose, 74],
  "kneeling-backbend": [C.pose],
  "hip-flexor-stretch": [C.warmUp, 45],
  "deep-squat-hold": [C.warmUp],
  "wrist-flexion-iso": [C.curl], "pronation-iso": [C.curl], "grip-squeeze": [C.curl],
  "wrist-curl-eccentric": [C.curl, 18], "wrist-extension-curl": [C.curl, 17],
  "wrist-deviation": [C.curl], "forearm-rotation": [C.curl], "finger-extension": [C.curl],
  "wrist-flexor-stretch": [C.warmUp, 41],
  "horse-stance": [C.squat], "wall-sit": [C.squat, 20], "bow-stance": [C.lunge], "crane-stance": [C.hipStability],
  plank: [C.plank, 43], "side-plank": [C.plank, 66],
  "hollow-body": [C.core], "hollow-body:rock": [C.crunch, 24],
  superman: [C.hyperextension, 29],
  "l-v-sit": [C.core, 88], "l-v-sit:v-sit": [C.move, 65],
  "dragon-flag": [C.core],
  "roman-chair": [C.core, 41], "roman-chair:obliques": [C.core], "roman-chair:glutes": [C.hyperextension],
  "push-up": [C.pushUp, 77],
  dips: [C.tricepsExtension, 2], "dips:bench": [C.tricepsExtension, 0],
  "iso-strap-press": [C.shoulderPress], "iso-strap-press:chest": [C.benchPress],
  "iso-strap-press:lateral": [C.lateralRaise], "iso-strap-press:press-back": [C.shoulderStability],
  "pull-up": [C.pullUp, 38], "chin-up": [C.pullUp, 39], hang: [C.pullUp], "hang:l-sit": [C.core, 75], "iso-pull-up": [C.pullUp],
  "box-squat": [C.squat, 61], bulgarian: [C.lunge], cossack: [C.lunge, 61],
  nordic: [C.legCurl], "reverse-nordic": [C.squat], "iso-deadlift": [C.deadlift],
  handstand: [C.totalBody], crow: [C.totalBody], "walk-press": [C.pushUp], planche: [C.totalBody],
  "front-lever": [C.core, 20],
  "wall-split": [C.warmUp], "front-split": [C.warmUp, 43], "side-split": [C.warmUp, 68],
  pancake: [C.pose, 57], pigeon: [C.warmUp, 59], "jefferson-curl": [C.deadlift],
};

/** Custom exercises (and anything not in CODES): a category from the section. */
const BY_SECTION: Record<SectionId, number> = {
  cardio: C.cardio, mobility: C.warmUp, physio: C.unknown, stances: C.squat, core: C.core,
  push: C.pushUp, pull: C.pullUp, legs: C.squat, skills: C.totalBody, flexibility: C.warmUp,
};

function codeFor(ex: Exercise | undefined, variationId?: string): Code {
  if (!ex) return [C.unknown];
  return CODES[`${ex.id}:${variationId}`] ?? CODES[ex.id] ?? [BY_SECTION[ex.section] ?? C.unknown];
}

// ── Workout → Garmin steps ──────────────────────────────────────────
/** Short enough for a watch: no "(…)" asides, and the variation only if it still fits. */
const NAME_FIT = 26;
function stepName(t: { main: string; sub?: string }) {
  const clean = (s: string) => s.replace(/\s*\([^)]*\)/g, "").trim();
  const main = clean(t.main), sub = t.sub && clean(t.sub);
  return sub && main.length + sub.length + 3 <= NAME_FIT ? `${main} · ${sub}` : main;
}
const DUR = { time: 0, open: 5, repeat: 6, reps: 29 } as const;
const INTENSITY = { active: 0, rest: 1 } as const;

export interface GarminStep {
  name?: string;
  notes?: string;
  durationType: number;
  /** time: ms; reps: count; repeat: index of the first step to repeat */
  durationValue?: number;
  /** repeat: how many times in all */
  repeatTimes?: number;
  intensity?: number;
  code?: Code;
  kg?: number;
}

export function garminSteps(w: Workout, custom?: Exercise[]): GarminStep[] {
  const out: GarminStep[] = [];
  const rest = (s: number, name: string) => {
    if (s > 0) out.push({ name, durationType: DUR.time, durationValue: s * 1000, intensity: INTENSITY.rest });
  };
  const repeat = (from: number, times: number) => {
    if (times > 1 && out.length > from) out.push({ durationType: DUR.repeat, durationValue: from, repeatTimes: times });
  };
  const work = (it: Item) => {
    const { ex, v, mode } = itemParts(it, custom);
    const name = stepName(itemTitle(ex, v));
    const code = codeFor(ex, it.variationId);
    const n = repeatsOf(it, mode);
    const sides = it.perSide ? (["left", "right"] as const) : [undefined];
    const [durationType, durationValue] =
      mode === "reps" ? (it.reps ? [DUR.reps, it.reps] : [DUR.open, undefined])
      : mode === "hold" ? (it.seconds ? [DUR.time, it.seconds * 1000] : [DUR.open, undefined])
      : it.minutes ? [DUR.time, it.minutes * 60_000] : [DUR.open, undefined];
    sides.forEach((side, si) => {
      if (si && mode !== "reps") rest(SWITCH_SIDES_S, "Switch sides");
      for (let k = 1; k <= n; k++) {
        if (k > 1) rest(it.repeatRest ?? 0, "Short rest");
        out.push({
          name: side ? `${name} · ${side}` : name, notes: ex?.cue,
          durationType, durationValue, intensity: INTENSITY.active, code, kg: it.kg,
        });
      }
    });
  };
  w.blocks.forEach((b, bi) => {
    const last = bi === w.blocks.length - 1;
    const from = out.length;
    if (b.kind === "straight") {
      const it = b.items[0];
      work(it);
      // The rest after each set; after the last set it's the rest before the next exercise.
      if (!(last && it.sets <= 1)) rest(it.rest, "Rest");
      repeat(from, it.sets);
    } else {
      b.items.forEach((it, ii) => { work(it); if (ii < b.items.length - 1) rest(it.rest, "Rest"); });
      if (!(last && b.rounds <= 1)) rest(b.restBetween, "Rest between rounds");
      repeat(from, b.rounds);
    }
  });
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
