// Built-in exercise catalog.
// Never rename or reuse an exercise or variation `id`: workouts, routines and
// history are keyed by id. Add new ids instead.

export type SectionId =
  | "cardio"
  | "mobility"
  | "physio"
  | "stances"
  | "core"
  | "push"
  | "pull"
  | "legs"
  | "skills"
  | "flexibility";

/** Body region tags, used as a filter across sections. */
export type Region = "upper" | "lower" | "core" | "full";

/**
 * reps = counted repetitions
 * hold = isometric / static hold, in seconds
 * time = continuous duration, in minutes (cardio, flows)
 */
export type Mode = "reps" | "hold" | "time";

export type Equipment =
  | "wall"
  | "mat"
  | "pull-up-bar"
  | "dip-bars"
  | "chair"
  | "jump-rope"
  | "bike"
  | "roman-chair"
  | "strap"
  | "anchor"
  | "parallettes"
  | "kettlebell";

/** What I have at home. The builder can hide exercises that need anything else. */
export const HOME_EQUIPMENT: Equipment[] = [
  "wall",
  "mat",
  "pull-up-bar",
  "dip-bars",
  "parallettes",
  "roman-chair",
  "bike",
  "jump-rope",
  "chair",
  "strap",
  "anchor", // the bed, for Nordics
  "kettlebell", // 12 kg
];

export const REGION_LABEL: Record<Region, string> = {
  upper: "Upper body",
  lower: "Lower body",
  core: "Core",
  full: "Full body",
};

export const MODE_LABEL: Record<Mode, string> = {
  reps: "Reps",
  hold: "Hold",
  time: "Time",
};

/** Seconds in Cardio are work time (sprints), not a static hold. */
export const isTimedWork = (mode: Mode, ex?: Pick<Exercise, "section">) => mode === "hold" && ex?.section === "cardio";
export const modeLabel = (mode: Mode, ex?: Pick<Exercise, "section">) => (isTimedWork(mode, ex) ? "Timed" : MODE_LABEL[mode]);

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  wall: "Wall",
  mat: "Yoga mat",
  "pull-up-bar": "Pull-up bar",
  "dip-bars": "Dip bars",
  "jump-rope": "Jump rope",
  bike: "Spin bike",
  "roman-chair": "Roman chair",
  strap: "Iso strap",
  anchor: "Bed (anchor)",
  parallettes: "Parallettes",
  kettlebell: "Kettlebell",
  chair: "Chair",
};

/** Default dose when the exercise is added to a workout. */
export interface Dose {
  sets: number;
  reps?: number;
  seconds?: number;
  minutes?: number;
  /** Added weight in kg (kettlebell, weighted pull ups). */
  kg?: number;
}

export interface Variation {
  id: string;
  name: string;
  /** Overrides the exercise mode, e.g. a static hold of a rep exercise. */
  mode?: Mode;
  dose?: Dose;
}

export interface Exercise {
  id: string;
  name: string;
  section: SectionId;
  regions: Region[];
  mode: Mode;
  /** Done once per side (dose is per side). */
  perSide?: boolean;
  equipment?: Equipment[];
  dose: Dose;
  variations?: Variation[];
  /** One-line form cue. */
  cue?: string;
  aliases?: string[];
  /** Custom exercises only (ids start with `u-`): last edit, and a soft delete like workouts. */
  updatedAt?: number;
  deletedAt?: number;
}

export interface Section {
  id: SectionId;
  name: string;
  blurb: string;
}

export const SECTIONS: Section[] = [
  { id: "cardio", name: "Cardio & Plyo", blurb: "Heart rate and jumping." },
  { id: "mobility", name: "Mobility & Warm-up", blurb: "Joint prep, spine and hips." },
  { id: "physio", name: "Physio & Prehab", blurb: "Tendon isometrics and rehab work, e.g. for the elbow." },
  { id: "stances", name: "Stances", blurb: "Static leg strength and balance." },
  { id: "core", name: "Core", blurb: "Front, side and back of the trunk." },
  { id: "push", name: "Upper Push", blurb: "Chest, shoulders, triceps, incl. isometric presses." },
  { id: "pull", name: "Upper Pull", blurb: "Back, biceps, grip." },
  { id: "legs", name: "Legs & Posterior Chain", blurb: "Squats, hinges, hamstrings, quads." },
  { id: "skills", name: "Skills & Balance", blurb: "Hand balancing and strength skills." },
  { id: "flexibility", name: "Flexibility", blurb: "Splits and long holds." },
];

export const EXERCISES: Exercise[] = [
  // ── Cardio & Plyo ───────────────────────────────────────────────
  {
    id: "frog-jump",
    name: "Frog jump",
    section: "cardio",
    regions: ["lower", "full"],
    mode: "reps",
    dose: { sets: 3, reps: 10 },
    cue: "Squat deep, touch the floor, jump forward and land soft back into the squat.",
  },
  {
    id: "jump-rope",
    name: "Jump rope",
    section: "cardio",
    regions: ["full"],
    mode: "time",
    equipment: ["jump-rope"],
    dose: { sets: 3, minutes: 2 },
    variations: [
      { id: "basic", name: "Basic bounce" },
      { id: "alternate", name: "Alternate foot" },
      { id: "double-under", name: "Double unders", mode: "reps", dose: { sets: 3, reps: 20 } },
    ],
    cue: "Stay on the balls of your feet, wrists turn the rope, elbows close.",
  },
  {
    id: "spinning",
    name: "Spinning",
    section: "cardio",
    regions: ["lower", "full"],
    mode: "time",
    equipment: ["bike"],
    dose: { sets: 1, minutes: 20 },
    variations: [
      { id: "steady", name: "Steady" },
      { id: "intervals", name: "Intervals" },
    ],
    aliases: ["Spin bike"],
  },
  {
    id: "running",
    name: "Running",
    section: "cardio",
    regions: ["lower", "full"],
    mode: "time",
    dose: { sets: 1, minutes: 30 },
    variations: [
      { id: "easy", name: "Easy run" },
      { id: "tempo", name: "Tempo run", dose: { sets: 1, minutes: 20 } },
      { id: "intervals", name: "Intervals", dose: { sets: 6, minutes: 1 } },
      { id: "sprints", name: "Sprints", mode: "hold", dose: { sets: 6, seconds: 30 } },
    ],
    cue: "Tall posture, short quick steps landing under the hips, relaxed shoulders.",
    aliases: ["Run", "Jogging", "Jog"],
  },

  // ── Mobility & Warm-up ─────────────────────────────────────────
  {
    id: "cat-cow",
    name: "Cat cow",
    section: "mobility",
    regions: ["core"],
    mode: "reps",
    dose: { sets: 1, reps: 10 },
    cue: "Move one vertebra at a time: breathe in to arch, breathe out to round.",
  },
  {
    id: "dog-flow",
    name: "Upward / downward dog",
    section: "mobility",
    regions: ["full"],
    mode: "reps",
    dose: { sets: 1, reps: 8 },
    variations: [
      { id: "flow", name: "Flow between the two" },
      { id: "up-hold", name: "Upward dog hold", mode: "hold", dose: { sets: 2, seconds: 20 } },
      { id: "down-hold", name: "Downward dog hold", mode: "hold", dose: { sets: 2, seconds: 30 } },
    ],
    cue: "Up dog: hips low, chest forward. Down dog: hips high, push the floor away.",
  },
  {
    id: "glute-bridge",
    name: "Glute bridge / reverse tabletop",
    section: "mobility",
    regions: ["lower", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 12 },
    variations: [
      { id: "bridge", name: "Glute bridge" },
      { id: "bridge-hold", name: "Glute bridge hold", mode: "hold", dose: { sets: 3, seconds: 30 } },
      { id: "single-leg", name: "Single-leg glute bridge", dose: { sets: 3, reps: 8 } },
      { id: "reverse-tabletop", name: "Reverse tabletop", mode: "hold", dose: { sets: 3, seconds: 20 } },
    ],
    cue: "Squeeze the glutes at the top; ribs down, don't arch the lower back.",
  },
  {
    id: "kneeling-backbend",
    name: "Kneeling backbend",
    section: "mobility",
    regions: ["core", "upper"],
    mode: "hold",
    dose: { sets: 3, seconds: 20 },
    cue: "Hips over knees, glutes tight, lift the chest before reaching back.",
    aliases: ["Camel"],
  },
  {
    id: "hip-flexor-stretch",
    name: "Hip flexor stretch",
    section: "mobility",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 30 },
    variations: [
      { id: "half-kneeling", name: "Half-kneeling" },
      { id: "couch", name: "Couch stretch" },
    ],
    cue: "Tuck the pelvis and squeeze the back glute; feel it in the front of the hip, not the lower back.",
  },
  {
    id: "deep-squat-hold",
    name: "Deep squat hold",
    section: "mobility",
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 2, seconds: 60 },
    cue: "Heels down, chest up, knees track over the toes.",
  },

  // ── Physio & Prehab ────────────────────────────────────────────
  // Golfer's elbow (wrist flexors / pronators at the inner elbow). Moderate effort, pain at most 3/10.
  {
    id: "wrist-flexion-iso",
    name: "Wrist flexion hold",
    section: "physio",
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 5, seconds: 45 },
    variations: [
      { id: "hand", name: "Against other hand" },
      { id: "table", name: "Under a table" },
      { id: "strap", name: "Iso strap" },
    ],
    cue: "Elbow bent 90° at your side, palm up, wrist straight; curl up into the resistance at about 50–70% effort without moving. Pain no more than 3/10.",
    aliases: ["Golfer's elbow isometric", "Wrist flexor isometric", "Medial epicondylitis"],
  },
  {
    id: "pronation-iso",
    name: "Forearm pronation hold",
    section: "physio",
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 4, seconds: 30 },
    cue: "Elbow bent 90° at your side, palm up; try to turn the palm down while the other hand stops it. Steady pressure, no movement.",
    aliases: ["Pronator isometric", "Golfer's elbow"],
  },
  {
    id: "grip-squeeze",
    name: "Grip squeeze",
    section: "physio",
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 3, seconds: 30 },
    variations: [
      { id: "towel", name: "Rolled towel" },
      { id: "ball", name: "Soft ball" },
    ],
    cue: "Squeeze at a moderate, steady effort with the wrist straight or slightly back; ease off if the inner elbow flares.",
    aliases: ["Grip isometric", "Golfer's elbow"],
  },
  {
    id: "wrist-curl-eccentric",
    name: "Eccentric wrist curl",
    section: "physio",
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 15 },
    variations: [
      { id: "manual", name: "Other hand resists" },
      { id: "light-weight", name: "Light weight (1–2 kg bottle)" },
    ],
    cue: "Forearm on your thigh, palm up, wrist past the knee. Lower the hand slowly over 3–4 s against the resistance, then help it back up with the other hand.",
    aliases: ["Wrist flexor eccentric", "Golfer's elbow"],
  },
  {
    id: "wrist-flexor-stretch",
    name: "Wrist flexor stretch",
    section: "physio",
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 30 },
    cue: "Arm straight in front, palm up; gently pull the fingers down and back until you feel a mild stretch in the inner forearm.",
    aliases: ["Forearm stretch", "Golfer's elbow"],
  },

  // ── Stances ────────────────────────────────────────────────────
  {
    id: "horse-stance",
    name: "Horse stance",
    section: "stances",
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 3, seconds: 45 },
    cue: "Feet wide, thighs toward parallel, back upright, knees pushed out.",
  },
  {
    id: "wall-sit",
    name: "Wall sit",
    section: "stances",
    regions: ["lower"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 3, seconds: 45 },
    variations: [
      { id: "two-leg", name: "Two legs" },
      { id: "single-leg", name: "Single leg", dose: { sets: 2, seconds: 20 } },
    ],
    cue: "Back flat on the wall, knees at 90°, weight in the heels.",
  },
  {
    id: "bow-stance",
    name: "Bow stance",
    section: "stances",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 30 },
    cue: "Front knee over the ankle, back leg straight with the heel down, hips square.",
    aliases: ["Gong bu"],
  },
  {
    id: "crane-stance",
    name: "Crane stance",
    section: "stances",
    regions: ["lower", "core"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 30 },
    variations: [
      { id: "eyes-open", name: "Eyes open" },
      { id: "eyes-closed", name: "Eyes closed" },
    ],
    cue: "Stand on one leg, other knee high, standing knee soft, tall spine.",
  },

  // ── Core ───────────────────────────────────────────────────────
  {
    id: "plank",
    name: "Plank",
    section: "core",
    regions: ["core"],
    mode: "hold",
    dose: { sets: 3, seconds: 45 },
    variations: [
      { id: "forearm", name: "Forearm" },
      { id: "high", name: "Straight arm" },
      { id: "rkc", name: "RKC (max tension)", dose: { sets: 3, seconds: 15 } },
    ],
    cue: "Straight line head to heels, glutes and abs tight, push the floor away.",
  },
  {
    id: "side-plank",
    name: "Side plank",
    section: "core",
    regions: ["core"],
    mode: "hold",
    perSide: true,
    dose: { sets: 3, seconds: 30 },
    variations: [
      { id: "forearm", name: "Forearm" },
      { id: "straight-arm", name: "Straight arm" },
      { id: "star", name: "Star (top leg raised)" },
    ],
    cue: "Hips high, body in one line, shoulder stacked over the elbow.",
  },
  {
    id: "hollow-body",
    name: "Hollow body",
    section: "core",
    regions: ["core"],
    mode: "hold",
    dose: { sets: 3, seconds: 30 },
    variations: [
      { id: "tuck", name: "Tuck hollow" },
      { id: "full", name: "Full hollow" },
      { id: "rock", name: "Hollow rocks", mode: "reps", dose: { sets: 3, reps: 15 } },
    ],
    cue: "Lower back pressed into the floor, shoulders off, legs as low as you can keep it.",
  },
  {
    id: "superman",
    name: "Superman",
    section: "core",
    regions: ["core", "lower"],
    mode: "hold",
    dose: { sets: 3, seconds: 20 },
    variations: [
      { id: "hold", name: "Hold" },
      { id: "reps", name: "Lift and lower", mode: "reps", dose: { sets: 3, reps: 12 } },
      { id: "arch-rock", name: "Arch rocks", mode: "reps", dose: { sets: 3, reps: 15 } },
    ],
    cue: "Lift arms, chest and legs together; glutes tight, neck long.",
  },
  {
    id: "l-v-sit",
    name: "L / V sit",
    section: "core",
    regions: ["core", "upper"],
    mode: "hold",
    equipment: ["parallettes"],
    dose: { sets: 4, seconds: 10 },
    variations: [
      { id: "tuck", name: "Tuck sit" },
      { id: "one-leg", name: "One-leg L sit" },
      { id: "l-sit", name: "L sit" },
      { id: "v-sit", name: "V sit", dose: { sets: 4, seconds: 5 } },
    ],
    cue: "Shoulders pushed down, arms locked, legs straight and squeezed together.",
  },
  {
    id: "dragon-flag",
    name: "Dragon flag",
    section: "core",
    regions: ["core"],
    mode: "reps",
    equipment: ["mat"],
    dose: { sets: 3, reps: 5 },
    variations: [
      { id: "tuck", name: "Tuck" },
      { id: "negative", name: "Negatives" },
      { id: "full", name: "Full" },
    ],
    cue: "On the floor, grip something heavy behind your head (a bed leg); only the upper back touches down, body straight, lower slowly.",
  },
  {
    id: "roman-chair",
    name: "Roman chair",
    section: "core",
    regions: ["core", "lower"],
    mode: "reps",
    equipment: ["roman-chair"],
    dose: { sets: 3, reps: 12 },
    variations: [
      { id: "back", name: "Back extension" },
      { id: "obliques", name: "Side bend (obliques)" },
      { id: "glutes", name: "Glute-focused hip extension" },
    ],
    cue: "Move from the hips, no swinging; pause at the top.",
  },

  // ── Upper Push ─────────────────────────────────────────────────
  {
    id: "push-up",
    name: "Push up",
    section: "push",
    regions: ["upper", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 12 },
    variations: [
      { id: "standard", name: "Standard" },
      { id: "static", name: "Static hold (bottom)", mode: "hold", dose: { sets: 3, seconds: 20 } },
      { id: "fingertip", name: "Fingertip", dose: { sets: 3, reps: 8 } },
      { id: "one-arm", name: "One arm", dose: { sets: 3, reps: 3 } },
    ],
    cue: "Body in one line, elbows about 45° from the body, chest to the floor.",
  },
  {
    id: "dips",
    name: "Dips",
    section: "push",
    regions: ["upper"],
    mode: "reps",
    equipment: ["dip-bars"],
    dose: { sets: 3, reps: 8 },
    variations: [
      { id: "parallel", name: "Parallel bars" },
      { id: "bench", name: "Chair dips", dose: { sets: 3, reps: 12 } },
    ],
    cue: "Shoulders down and back, go to about 90° at the elbow, lock out at the top.",
  },
  {
    id: "wall-push",
    name: "Wall push",
    section: "push",
    regions: ["upper"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 3, seconds: 10 },
    cue: "Press into the wall as hard as you can without moving; build tension over 2 s.",
  },
  {
    id: "wall-push-back",
    name: "Wall push backwards",
    section: "push",
    regions: ["upper"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 3, seconds: 10 },
    cue: "Back to the wall, arms by your sides, press the hands backwards into it.",
  },
  {
    id: "iso-strap-press",
    name: "Iso strap press",
    section: "push",
    regions: ["upper"],
    mode: "hold",
    equipment: ["strap"],
    dose: { sets: 3, seconds: 10 },
    variations: [
      { id: "overhead", name: "Overhead (stand on the strap)" },
      { id: "chest", name: "Chest press (strap behind the back)" },
      { id: "lateral", name: "Lateral raise (stand on the strap)" },
    ],
    cue: "Set the strap so the joint angle is where you want it, then build tension over 2 s and push as hard as you can.",
  },

  // ── Upper Pull ─────────────────────────────────────────────────
  {
    id: "pull-up",
    name: "Pull up",
    section: "pull",
    regions: ["upper"],
    mode: "reps",
    equipment: ["pull-up-bar"],
    dose: { sets: 4, reps: 5 },
    variations: [
      { id: "strict", name: "Strict" },
      { id: "negative", name: "Negatives (slow lower)" },
    ],
    cue: "Overhand grip, start from a dead hang, chin over the bar, no kipping.",
  },
  {
    id: "chin-up",
    name: "Chin up",
    section: "pull",
    regions: ["upper"],
    mode: "reps",
    equipment: ["pull-up-bar"],
    dose: { sets: 4, reps: 6 },
    cue: "Underhand grip, shoulder width; pull the elbows down to the ribs.",
  },
  {
    id: "hang",
    name: "Hang",
    section: "pull",
    regions: ["upper"],
    mode: "hold",
    equipment: ["pull-up-bar"],
    dose: { sets: 3, seconds: 30 },
    variations: [
      { id: "dead", name: "Dead hang" },
      { id: "active", name: "Active hang (shoulders engaged)" },
      { id: "l-sit", name: "L-sit hang", dose: { sets: 3, seconds: 10 } },
    ],
    cue: "Dead: fully relaxed shoulders. Active: pull the shoulders down away from the ears.",
  },
  {
    id: "iso-pull-up",
    name: "Iso pull up",
    section: "pull",
    regions: ["upper"],
    mode: "hold",
    equipment: ["pull-up-bar"],
    dose: { sets: 3, seconds: 15 },
    variations: [
      { id: "top", name: "Top (chin over bar)" },
      { id: "mid", name: "Mid (elbows at 90°)" },
    ],
    cue: "Hold the position still; chest up, legs quiet.",
  },

  // ── Legs & Posterior Chain ─────────────────────────────────────
  {
    id: "box-squat",
    name: "Box squat",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    equipment: ["chair"],
    dose: { sets: 3, reps: 10 },
    cue: "Sit back to the chair, touch lightly without relaxing, drive up through the heels.",
    aliases: ["Chair squat"],
  },
  {
    id: "bulgarian",
    name: "Bulgarian split squat",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    equipment: ["chair"],
    dose: { sets: 3, reps: 8 },
    cue: "Back foot on the chair, front knee tracks over the toes, torso tall.",
  },
  {
    id: "cossack",
    name: "Cossack squat",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 6 },
    cue: "Wide stance, sit into one hip with the other leg straight and toes up.",
  },
  {
    id: "nordic",
    name: "Nordic curl",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    equipment: ["anchor"],
    dose: { sets: 3, reps: 5 },
    variations: [
      { id: "negative", name: "Negatives" },
      { id: "full", name: "Full" },
    ],
    cue: "Ankles hooked under the bed, hips straight; lower as slowly as you can control.",
  },
  {
    id: "reverse-nordic",
    name: "Reverse nordic",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    dose: { sets: 3, reps: 8 },
    cue: "Kneel tall, lean back in one line from knees to head, quads doing the work.",
  },
  {
    id: "iso-deadlift",
    name: "Iso deadlift",
    section: "legs",
    regions: ["lower", "core"],
    mode: "hold",
    equipment: ["strap"],
    dose: { sets: 3, seconds: 10 },
    cue: "Stand on the strap, set the length so you hinge with a flat back, then pull up hard.",
  },

  // ── Skills & Balance ───────────────────────────────────────────
  {
    id: "handstand",
    name: "Handstand",
    section: "skills",
    regions: ["upper", "core"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 5, seconds: 20 },
    variations: [
      { id: "chest-to-wall", name: "Chest to wall" },
      { id: "back-to-wall", name: "Back to wall" },
      { id: "freestanding", name: "Freestanding", dose: { sets: 8, seconds: 10 } },
    ],
    cue: "Push tall through the shoulders, ribs in, squeeze legs together, balance in the fingers.",
  },
  {
    id: "crow",
    name: "Crow",
    section: "skills",
    regions: ["upper", "core"],
    mode: "hold",
    dose: { sets: 5, seconds: 15 },
    variations: [
      { id: "crow", name: "Crow (bent arms)" },
      { id: "crane", name: "Crane (straight arms)" },
      { id: "side", name: "Side crow" },
    ],
    cue: "Knees high on the upper arms, lean forward until the feet float, look ahead.",
  },
  {
    id: "walk-press",
    name: "Walk press",
    section: "skills",
    regions: ["upper", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 5 },
    cue: "Start of a press to handstand: lean the shoulders over the hands until the feet lift a little, then move forward.",
    aliases: ["Walk presses", "Press walk"],
  },
  {
    id: "planche",
    name: "Planche",
    section: "skills",
    regions: ["upper", "core"],
    mode: "hold",
    equipment: ["parallettes"],
    dose: { sets: 5, seconds: 10 },
    variations: [
      { id: "lean", name: "Planche lean", dose: { sets: 4, seconds: 20 } },
      { id: "tuck", name: "Tuck planche" },
      { id: "adv-tuck", name: "Advanced tuck" },
      { id: "straddle", name: "Straddle" },
    ],
    cue: "Arms locked, shoulders protracted and pushed forward past the hands.",
  },

  // ── Flexibility ────────────────────────────────────────────────
  {
    id: "wall-split",
    name: "Wall split",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 1, seconds: 120 },
    cue: "Lie on your back with legs up the wall and let them open slowly.",
  },
  {
    id: "front-split",
    name: "Front split",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 60 },
    cue: "Hips square, back knee down or off, use blocks under the hands.",
  },
  {
    id: "side-split",
    name: "Side split",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 2, seconds: 60 },
    cue: "Toes up or forward, tilt the pelvis forward, sink slowly.",
    aliases: ["Middle split"],
  },
  {
    id: "pancake",
    name: "Pancake",
    section: "flexibility",
    regions: ["lower", "core"],
    mode: "hold",
    dose: { sets: 2, seconds: 60 },
    cue: "Legs wide, fold from the hips with a long back, chest toward the floor.",
  },
  {
    id: "pigeon",
    name: "Pigeon",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 60 },
    cue: "Front shin forward, hips square, fold over the front leg.",
  },
  {
    id: "jefferson-curl",
    name: "Jefferson curl",
    section: "flexibility",
    regions: ["core", "lower"],
    mode: "reps",
    equipment: ["chair", "kettlebell"],
    dose: { sets: 3, reps: 8, kg: 12 },
    cue: "Stand on the chair holding the kettlebell; roll down one vertebra at a time and back up. Go slow.",
  },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
