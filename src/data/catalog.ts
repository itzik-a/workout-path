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

/**
 * What an exercise trains, across sections (search + the focus chips above the list).
 * An exercise can have several, e.g. a plank is strength and isometric.
 */
export type Focus = "strength" | "isometric" | "mobility" | "flexibility" | "cardio";

export const FOCUS_LABEL: Record<Focus, string> = {
  strength: "Strength",
  isometric: "Isometric",
  mobility: "Mobility",
  flexibility: "Flexibility",
  cardio: "Cardio",
};

/** Extra words the search box matches for each focus. */
export const FOCUS_TERMS: Record<Focus, string[]> = {
  strength: ["Strength", "Strengthening"],
  isometric: ["Isometric", "Isometrics", "Static"],
  mobility: ["Mobility"],
  flexibility: ["Flexibility", "Stretch", "Stretches", "Stretching"],
  cardio: ["Cardio", "Conditioning"],
};

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
  | "kettlebell"
  | "rings"
  | "dip-belt"
  | "barbell";

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
  "rings",
  "dip-belt", // chain belt: hang the kettlebell for weighted pull ups and dips
  "barbell", // Olympic bar 20 kg + 2 × 5 kg + 2 × 10 kg plates (up to 50 kg)
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
  rings: "Gymnastic rings",
  chair: "Chair",
  "dip-belt": "Dip belt",
  barbell: "Barbell + plates",
};

/** Default dose when the exercise is added to a workout. */
export interface Dose {
  sets: number;
  reps?: number;
  seconds?: number;
  minutes?: number;
  /** Added weight in kg (kettlebell, weighted pull ups). */
  kg?: number;
  /** Interval holds: each set is `repeats` holds of `seconds`, with `repeatRest` s between them. */
  repeats?: number;
  repeatRest?: number;
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
  /** How-to videos for built-in exercises (shown on the exercise page and in the player). */
  links?: { url: string; label?: string }[];
  aliases?: string[];
  /** Built-in exercise no longer offered: hidden from the catalog and picker, but kept so
      workouts and history that use it still resolve. Never delete an exercise; retire it. */
  retired?: boolean;
  /** What it trains. Leave out to use the default from the section (see `focusOf`). */
  focus?: Focus[];
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
    focus: ["mobility", "flexibility"],
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
    focus: ["mobility", "strength", "isometric"],
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
    focus: ["mobility", "flexibility"],
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
    focus: ["mobility", "flexibility"],
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
    focus: ["mobility", "flexibility"],
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 2, seconds: 60 },
    cue: "Heels down, chest up, knees track over the toes.",
  },
  {
    id: "straddle-pelvic-tilt",
    name: "Straddle pelvic tilts",
    section: "mobility",
    regions: ["lower", "core"],
    mode: "reps",
    dose: { sets: 2, reps: 10 },
    cue: "Sit in a wide straddle, hands behind you; roll the pelvis forward (arch the lower back) and back, slowly. Sit on a folded mat if the pelvis tips back.",
    aliases: ["Pancake", "Anterior pelvic tilt", "Straddle"],
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
    cue: "Elbow bent 90° at your side, palm up, wrist straight; curl up into the resistance at about 50–70% effort without moving. Iso strap: stand on it and set the length so it's taut with the wrist straight, then curl up into it. Pain no more than 3/10.",
    links: [{ url: "https://www.youtube.com/watch?v=jSX3SJwFv20", label: "Video: Momenta Chiropractic" }],
    aliases: ["Golfer's elbow isometric", "Wrist flexor isometric", "Medial epicondylitis"],
  },
  {
    id: "pronation-iso",
    name: "Forearm rotation hold",
    section: "physio",
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 4, seconds: 30 },
    variations: [
      { id: "pronation", name: "Pronation (turn the palm down)" },
      { id: "supination", name: "Supination (turn the palm up)" },
    ],
    cue: "Elbow bent 90° at your side. Pronation: palm up, try to turn it down; supination: palm down, try to turn it up. The other hand grips the wrist and stops it: steady pressure, no movement. No free hand: use the iso strap setup from Forearm rotation and hold the push.",
    links: [{ url: "https://www.youtube.com/watch?v=U0KDVbvhKQw", label: "Video: Rehab My Patient" }],
    aliases: ["Forearm pronation hold", "Pronator isometric", "Supinator isometric", "Golfer's elbow"],
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
      { id: "ball-reps", name: "Ball squeezes", mode: "reps", dose: { sets: 3, reps: 15 } },
    ],
    cue: "Squeeze at a moderate, steady effort with the wrist straight or slightly back; ease off if the inner elbow flares. Ball squeezes: squeeze a tennis ball hard for 2–3 s, let go slowly, repeat.",
    links: [{ url: "https://www.youtube.com/shorts/z_qWDyMF334", label: "Video: Be Mobile Physiotherapy" }],
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
      { id: "full", name: "Full curl (band / weight)" },
    ],
    cue: "Forearm on your thigh, palm up, wrist past the knee. Eccentric: lower the hand slowly over 3–4 s against the other hand or a light weight, then help it back up. Full curl: curl up and lower over 3 s with a light weight, or a resistance band under your foot. Iso strap: under your foot, length set so the wrist is level; curl up into it for 3–5 s each rep without moving.",
    links: [{ url: "https://www.youtube.com/watch?v=fQl7Qao_92k", label: "Video: Momenta Chiropractic" }],
    aliases: ["Wrist flexor eccentric", "Golfer's elbow"],
  },
  {
    id: "wrist-deviation",
    name: "Wrist deviation",
    section: "physio",
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 15 },
    variations: [
      { id: "radial", name: "Radial (toward the thumb)" },
      { id: "ulnar", name: "Ulnar (toward the little finger)" },
    ],
    cue: "Arm straight by your side, thumb forward; move only at the wrist, 2–3 s down. Radial: tilt the hand forward and up toward the thumb. Ulnar: tilt it back and up toward the little finger. Weight: hold a hammer or mop handle by one end, heavy end in front (radial) or behind (ulnar). Band: hold one end, the other under your foot. Iso strap: under your foot, taut with the wrist straight; push into it for 3–5 s each rep.",
    aliases: ["Radial deviation", "Ulnar deviation", "Golfer's elbow"],
  },
  {
    id: "forearm-rotation",
    name: "Forearm rotation",
    section: "physio",
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 12 },
    variations: [
      { id: "pronation", name: "Pronation (palm down)" },
      { id: "supination", name: "Supination (palm up)" },
    ],
    cue: "Elbow bent 90° at your side. Slowly turn the palm down (pronation) or up (supination) as far as is comfortable and back, 2–3 s each way. Weight: hold a hammer or mop handle by one end, pointing up (closer to the heavy end is easier). Band: hold one end, the other under your foot a little to the side, so it pulls against the turn. Iso strap: same setup, taut with the palm facing in; push the turn into it for 3–5 s each rep.",
    aliases: ["Pronation", "Supination", "Golfer's elbow"],
  },
  {
    id: "wrist-extension-curl",
    name: "Wrist extension curl",
    section: "physio",
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 15 },
    cue: "Forearm on your thigh, palm down, hand past the knee. Lift the back of the hand up, then lower over 3 s. Weight: a 1–2 kg bottle. Band: under your foot, hold the other end. Iso strap: under your foot, length set so the wrist is level; lift into it for 3–5 s each rep. Works the extensors on the back of the forearm to balance the flexors.",
    aliases: ["Reverse wrist curl", "Wrist extensor", "Golfer's elbow"],
  },
  {
    id: "finger-extension",
    name: "Finger extension",
    section: "physio",
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 15 },
    variations: [
      { id: "band", name: "Rubber band" },
      { id: "hand-hold", name: "Hold against the other hand", mode: "hold", dose: { sets: 3, seconds: 20 } },
    ],
    cue: "Rubber band or finger band: loop it around all five fingertips, open the hand as wide as you can against it, close slowly. Hold: fingers straight, the other hand presses down on their backs; push up into it at moderate effort without moving.",
    aliases: ["Finger extensor", "Golfer's elbow"],
  },
  {
    id: "wrist-flexor-stretch",
    name: "Wrist flexor stretch",
    section: "physio",
    focus: ["flexibility"],
    regions: ["upper"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 30 },
    cue: "Arm straight in front, palm up; gently pull the fingers down and back until you feel a mild stretch in the inner forearm.",
    links: [{ url: "https://www.youtube.com/watch?v=RRM63cEPGa8", label: "Video: Merck Manual" }],
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
    focus: ["isometric"],
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
  {
    id: "spanish-squat",
    name: "Spanish squat",
    section: "stances",
    regions: ["lower"],
    mode: "hold",
    equipment: ["strap"],
    dose: { sets: 5, seconds: 45 },
    cue: "Strap around a post and behind both knees, step back until it's taut; sit back with the shins vertical and the torso upright, thighs toward level, and hold. Easy on the knees, hard on the quads.",
    aliases: ["Spanish squat hold", "Patellar tendon isometric"],
  },
  {
    id: "split-squat-hold",
    name: "Split squat hold",
    section: "stances",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 3, seconds: 30 },
    cue: "Long split stance, lower until both knees are at 90°, back knee just off the floor, torso tall, front heel down; hold still.",
    aliases: ["Lunge hold", "Iso lunge", "Isometric split squat"],
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
      { id: "weighted", name: "Weighted (dip belt)", dose: { sets: 3, reps: 6, kg: 12 } },
    ],
    cue: "Shoulders down and back, go to about 90° at the elbow, lock out at the top.",
  },
  {
    id: "wall-push",
    retired: true, // replaced by the Iso strap press
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
    retired: true, // replaced by the Iso strap press
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
      { id: "press-back", name: "Straight-arm press back (strap under the front foot)" },
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
      { id: "weighted", name: "Weighted (dip belt)", dose: { sets: 4, reps: 4, kg: 12 } },
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
    variations: [
      { id: "standard", name: "Bodyweight" },
      { id: "weighted", name: "Weighted (dip belt)", dose: { sets: 4, reps: 5, kg: 12 } },
    ],
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
    focus: ["strength", "mobility"],
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 6 },
    cue: "Wide stance, sit into one hip with the other leg straight and toes up.",
  },
  {
    id: "wide-good-morning",
    name: "Wide-stance good morning",
    section: "legs",
    focus: ["strength", "flexibility"],
    regions: ["lower", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 10 },
    variations: [
      { id: "bodyweight", name: "Hands behind the head" },
      { id: "kettlebell", name: "Kettlebell at the chest", dose: { sets: 3, reps: 8, kg: 12 } },
      { id: "barbell", name: "Barbell on the back", dose: { sets: 3, reps: 8, kg: 30 } },
    ],
    cue: "Feet wide, toes slightly out, knees soft; hinge with a flat back until the inner hamstrings and adductors stretch, 3–4 s on the way down, then squeeze the glutes to stand.",
    aliases: ["Straddle good morning", "Pancake", "Adductor", "Hinge"],
  },
  {
    id: "pistol-squat",
    name: "Pistol squat",
    section: "legs",
    focus: ["strength", "mobility"],
    regions: ["lower", "core"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 5 },
    variations: [
      { id: "box", name: "To a chair (box pistol)" },
      { id: "assisted", name: "Assisted (holding a door frame)" },
      { id: "negative", name: "Negatives (lower slowly)", dose: { sets: 3, reps: 3 } },
      { id: "full", name: "Full" },
    ],
    cue: "Stand on one leg, the other straight out in front; sit all the way down with the heel flat and the knee over the toes, arms forward for balance, then drive up without bouncing.",
    aliases: ["Single leg squat", "One leg squat"],
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
      { id: "hold", name: "Hold (at a fixed angle)", mode: "hold", dose: { sets: 3, seconds: 10, repeats: 5, repeatRest: 5 } },
    ],
    cue: "Ankles hooked under the bed, hips straight; lower as slowly as you can control. Hold: stop at the lowest angle you can keep still.",
  },
  {
    id: "reverse-nordic",
    name: "Reverse nordic",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    dose: { sets: 3, reps: 8 },
    variations: [
      { id: "full", name: "Lean back and up" },
      { id: "hold", name: "Hold (at a fixed angle)", mode: "hold", dose: { sets: 3, seconds: 10, repeats: 5, repeatRest: 5 } },
    ],
    cue: "Kneel tall, lean back in one line from knees to head, quads doing the work. Hold: stop at the deepest angle you can keep still.",
  },
  {
    id: "tibialis-raise",
    name: "Tibialis raise",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    equipment: ["wall"],
    dose: { sets: 3, reps: 15 },
    variations: [
      { id: "raises", name: "Raises" },
      { id: "hold", name: "Hold (toes up)", mode: "hold", dose: { sets: 3, seconds: 30 } },
    ],
    cue: "Back and hips on the wall, heels a foot or so out, legs straight; pull the toes up toward the shins as high as they go, lower slowly. Feet further out is harder.",
    aliases: ["Tib raise", "Wall tibialis raise", "Toe raise", "Shin raise"],
  },
  {
    id: "calf-raise",
    name: "Calf raise",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    dose: { sets: 3, reps: 15 },
    variations: [
      { id: "two-leg", name: "Two legs" },
      { id: "single-leg", name: "Single leg", dose: { sets: 3, reps: 10 } },
      { id: "hold", name: "Hold (on the toes)", mode: "hold", dose: { sets: 3, seconds: 30 } },
    ],
    cue: "On the balls of the feet (a step edge lets the heels drop lower), knees straight; rise as high as you can, pause, lower slowly. A hand on the wall for balance.",
    aliases: ["Heel raise", "Standing calf raise"],
  },
  {
    id: "copenhagen-plank",
    name: "Copenhagen plank",
    section: "legs",
    focus: ["strength", "isometric"],
    regions: ["lower", "core"],
    mode: "hold",
    perSide: true,
    equipment: ["chair"],
    dose: { sets: 3, seconds: 20 },
    variations: [
      { id: "short", name: "Short lever (knee on the chair)" },
      { id: "long", name: "Long lever (foot on the chair)" },
    ],
    cue: "Side plank on the forearm with the top leg on the chair seat, bottom leg off the floor; hips high, body in one line, press the top inner thigh down into the chair.",
    aliases: ["Copenhagen adductor", "Adductor plank"],
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

  // Glutes: hip thrusts, hinges, single-leg squats and lunges, abduction
  {
    id: "hip-thrust",
    name: "Barbell hip thrust",
    section: "legs",
    focus: ["strength"],
    regions: ["lower"],
    mode: "reps",
    equipment: ["barbell", "chair"],
    dose: { sets: 3, reps: 10, kg: 40 },
    variations: [
      { id: "barbell", name: "Barbell" },
      { id: "paused", name: "Paused (2 s at the top)", dose: { sets: 3, reps: 8, kg: 40 } },
    ],
    cue: "Upper back on the couch or bed edge (a chair against the wall), bar padded over the hips; drive through the heels to a flat top, chin tucked, ribs down.",
    aliases: ["Hip thrust", "Glute"],
  },
  {
    id: "single-leg-hip-thrust",
    name: "Single-leg hip thrust",
    section: "legs",
    focus: ["strength"],
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    equipment: ["chair"],
    dose: { sets: 3, reps: 10 },
    variations: [
      { id: "bodyweight", name: "Bodyweight" },
      { id: "kettlebell", name: "Kettlebell on the hip", dose: { sets: 3, reps: 8, kg: 12 } },
    ],
    cue: "Shoulders on the chair or couch, one foot planted under the knee; lift until hip and knee line up, 2 s squeeze, hips level.",
    aliases: ["Glute"],
  },
  {
    id: "barbell-rdl",
    name: "Romanian deadlift",
    section: "legs",
    regions: ["lower", "core"],
    mode: "reps",
    equipment: ["barbell"],
    dose: { sets: 3, reps: 8, kg: 40 },
    cue: "Soft knees, push the hips back with the bar against the legs; stop when the hamstrings stretch and the back would round, then squeeze the glutes to stand.",
    aliases: ["RDL", "Hinge", "Glute"],
  },
  {
    id: "single-leg-rdl",
    name: "Single-leg Romanian deadlift",
    section: "legs",
    regions: ["lower", "core"],
    mode: "reps",
    perSide: true,
    equipment: ["kettlebell"],
    dose: { sets: 3, reps: 8, kg: 12 },
    variations: [
      { id: "bodyweight", name: "Bodyweight (reach)", dose: { sets: 3, reps: 10 } },
      { id: "kettlebell", name: "Kettlebell" },
    ],
    cue: "Hinge on one leg, the other reaching back in line with the body; hips square to the floor, slow on the way down.",
    aliases: ["RDL", "Hinge", "Glute"],
  },
  {
    id: "kb-swing",
    name: "Kettlebell swing",
    section: "legs",
    focus: ["strength", "cardio"],
    regions: ["lower", "full"],
    mode: "reps",
    equipment: ["kettlebell"],
    dose: { sets: 3, reps: 15, kg: 12 },
    variations: [
      { id: "two-hand", name: "Two hands" },
      { id: "one-arm", name: "One arm", dose: { sets: 3, reps: 10, kg: 12 } },
    ],
    cue: "Hike the bell back between the legs, then snap the hips forward; the arms only guide it to chest height. Stand tall and squeeze at the top.",
    aliases: ["Hinge", "Glute"],
  },
  {
    id: "reverse-lunge",
    name: "Reverse lunge",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 10 },
    variations: [
      { id: "flat", name: "Bodyweight" },
      { id: "deficit", name: "Deficit (front foot on a plate or step)" },
      { id: "deficit-kb", name: "Deficit with the kettlebell", dose: { sets: 3, reps: 8, kg: 12 } },
    ],
    cue: "Step back long, lean the torso a little forward and sink until the back knee nearly touches; push up through the front heel.",
    aliases: ["Glute"],
  },
  {
    id: "skater-squat",
    name: "Skater squat",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    dose: { sets: 3, reps: 6 },
    variations: [
      { id: "assisted", name: "Assisted (hold a door frame)", dose: { sets: 3, reps: 8 } },
      { id: "full", name: "Back knee to the floor" },
      { id: "weighted", name: "Holding the kettlebell", dose: { sets: 3, reps: 5, kg: 12 } },
    ],
    cue: "Stand on one leg, the other bent behind you; sit back and down until the back knee touches a pillow, then stand without a push.",
    aliases: ["Single-leg squat", "Glute"],
  },
  {
    id: "side-lying-abduction",
    name: "Side-lying hip abduction",
    section: "legs",
    regions: ["lower"],
    mode: "reps",
    perSide: true,
    equipment: ["mat"],
    dose: { sets: 2, reps: 15 },
    cue: "Lie on your side, top leg straight and slightly behind you, toes forward; lift with the side of the hip, 1 s hold, lower slowly.",
    aliases: ["Glute medius", "Abduction", "Glute"],
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
  {
    id: "front-lever",
    name: "Front lever",
    section: "skills",
    regions: ["upper", "core"],
    mode: "hold",
    equipment: ["pull-up-bar"],
    dose: { sets: 5, seconds: 10 },
    variations: [
      { id: "tuck", name: "Tuck front lever", dose: { sets: 5, seconds: 15 } },
      { id: "adv-tuck", name: "Advanced tuck (flat back)" },
      { id: "one-leg", name: "One leg" },
      { id: "straddle", name: "Straddle" },
      { id: "full", name: "Full", dose: { sets: 5, seconds: 5 } },
    ],
    cue: "Arms locked, push the bar down toward your hips, shoulders down away from the ears; hips in line with the shoulders, glutes tight.",
  },
  {
    id: "front-lever-row",
    name: "Front lever row",
    section: "skills",
    focus: ["strength"],
    regions: ["upper", "core"],
    mode: "reps",
    equipment: ["pull-up-bar"],
    dose: { sets: 4, reps: 5 },
    variations: [
      { id: "tuck", name: "Tuck" },
      { id: "adv-tuck", name: "Advanced tuck (flat back)" },
      { id: "straddle", name: "Straddle", dose: { sets: 4, reps: 3 } },
      { id: "full", name: "Full", dose: { sets: 4, reps: 2 } },
    ],
    cue: "From the front lever position, arms straight, pull the bar to the hips, body staying level; lower with control back to straight arms.",
    aliases: ["Lever row", "FL row"],
  },
  {
    id: "front-lever-pull-up",
    name: "Front lever pull-up",
    section: "skills",
    focus: ["strength"],
    regions: ["upper", "core"],
    mode: "reps",
    equipment: ["pull-up-bar"],
    dose: { sets: 4, reps: 3 },
    variations: [
      { id: "tuck", name: "Tuck" },
      { id: "adv-tuck", name: "Advanced tuck (flat back)" },
      { id: "straddle", name: "Straddle" },
      { id: "full", name: "Full", dose: { sets: 4, reps: 1 } },
    ],
    cue: "Hold the lever, then pull up toward the bar keeping the body horizontal, and lower back to the lever without dropping the hips.",
    aliases: ["Lever pull-up", "FL pull-up"],
  },
  {
    id: "muscle-up",
    name: "Muscle-up",
    section: "skills",
    focus: ["strength"],
    regions: ["upper", "core"],
    mode: "reps",
    equipment: ["pull-up-bar"],
    dose: { sets: 4, reps: 3 },
    variations: [
      { id: "high-pull", name: "High pull-ups (bar to the chest)", dose: { sets: 4, reps: 5 } },
      { id: "negative", name: "Negatives (from the top, slowly)" },
      { id: "jumping", name: "Jumping (a small jump to the top)" },
      { id: "strict", name: "Strict" },
    ],
    cue: "Pull explosively to the lower chest, lean the chest over the bar and turn the wrists over fast, then press out of the dip; keep the legs together and quiet.",
    aliases: ["Bar muscle-up", "Muscle up"],
  },
  {
    id: "one-arm-pull-up",
    name: "One-arm pull-up",
    section: "skills",
    focus: ["strength"],
    regions: ["upper"],
    mode: "reps",
    perSide: true,
    equipment: ["pull-up-bar"],
    dose: { sets: 3, reps: 2 },
    variations: [
      { id: "archer", name: "Archer pull-up", dose: { sets: 3, reps: 4 } },
      { id: "typewriter", name: "Typewriter pull-up", dose: { sets: 3, reps: 3 } },
      { id: "assisted", name: "Assisted (other hand on a towel)", dose: { sets: 3, reps: 3 } },
      { id: "top-hold", name: "One-arm hold at the top", mode: "hold", dose: { sets: 3, seconds: 10 } },
      { id: "negative", name: "One-arm negatives" },
      { id: "full", name: "Full", dose: { sets: 3, reps: 1 } },
    ],
    cue: "Shoulder packed down before you pull, the other arm and the legs quiet; pull the elbow to the ribs and keep the body from turning.",
    aliases: ["One arm pull up", "OAP", "Archer pull-up"],
  },
  {
    id: "skin-the-cat",
    name: "Skin the cat",
    section: "skills",
    focus: ["mobility", "strength"],
    regions: ["upper", "core"],
    mode: "reps",
    equipment: ["rings"],
    dose: { sets: 3, reps: 3 },
    variations: [
      { id: "through", name: "Through and back" },
      { id: "german-hang", name: "German hang", mode: "hold", dose: { sets: 3, seconds: 20 } },
    ],
    cue: "From a hang, tuck the knees and roll backward through the arms, lower slowly into the German hang as far as the shoulders allow, then come back the same way. Also on the bar.",
    aliases: ["German hang"],
  },
  {
    id: "bridge",
    name: "Bridge",
    section: "skills",
    focus: ["flexibility", "strength"],
    regions: ["upper", "core", "lower"],
    mode: "hold",
    equipment: ["wall"],
    dose: { sets: 3, seconds: 20 },
    variations: [
      { id: "floor", name: "From the floor" },
      { id: "straight-arm", name: "Straight arms (shoulders over the hands)" },
      { id: "wall-walk", name: "Wall walk-down and up", mode: "reps", dose: { sets: 3, reps: 3 } },
      { id: "stand-to-bridge", name: "Stand to bridge", mode: "reps", dose: { sets: 3, reps: 3 } },
    ],
    cue: "Hands by the ears, fingers toward the feet; push the floor away until the arms are straight and the chest moves over the hands, legs working, neck relaxed.",
    aliases: ["Wheel", "Back bridge", "Full bridge"],
  },
  {
    id: "iron-cross",
    name: "Iron cross",
    section: "skills",
    focus: ["strength", "isometric"],
    regions: ["upper"],
    mode: "hold",
    equipment: ["rings"],
    dose: { sets: 5, seconds: 5 },
    variations: [
      { id: "support-to", name: "Ring support, turned out", dose: { sets: 3, seconds: 20 } },
      { id: "band", name: "Band-assisted" },
      { id: "partial", name: "Partial (rings wide, arms at 45°)" },
      { id: "full", name: "Full", dose: { sets: 5, seconds: 3 } },
    ],
    cue: "Arms locked with the rings turned out, press the rings down and out to the sides, shoulders down, body straight. Go slowly: the elbows and shoulders need time to adapt.",
    aliases: ["Cross"],
  },
  {
    id: "manna",
    name: "Manna",
    section: "skills",
    focus: ["strength", "flexibility"],
    regions: ["upper", "core"],
    mode: "hold",
    equipment: ["parallettes"],
    dose: { sets: 5, seconds: 5 },
    variations: [
      { id: "compression", name: "Seated compression lifts", mode: "reps", dose: { sets: 3, reps: 10 } },
      { id: "v-sit", name: "V-sit", dose: { sets: 4, seconds: 10 } },
      { id: "high-v-sit", name: "High V-sit (hips past the hands)" },
      { id: "full", name: "Full", dose: { sets: 5, seconds: 3 } },
    ],
    cue: "Arms straight, push the shoulders back and down, hips forward past the hands, legs straight and lifted as high as the compression allows.",
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
    id: "hamstring-stretch",
    name: "Hamstring stretch",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 2, seconds: 45 },
    variations: [
      { id: "standing-fold", name: "Standing forward fold" },
      { id: "seated-pike", name: "Seated pike" },
      { id: "single-leg", name: "One leg up on a chair" },
    ],
    cue: "Hinge at the hips with a long back, knees straight but not locked; bring the chest toward the thighs and sink a little deeper on each breath out.",
    aliases: ["Pike stretch", "Forward fold", "Toe touch"],
  },
  {
    id: "calf-stretch",
    name: "Calf stretch",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    equipment: ["wall"],
    dose: { sets: 2, seconds: 30 },
    variations: [
      { id: "straight-knee", name: "Straight knee (calf)" },
      { id: "bent-knee", name: "Bent knee (soleus, Achilles)" },
    ],
    cue: "Hands on the wall, back foot pointing forward with the heel pressed down; move the hips toward the wall until the calf stretches.",
    aliases: ["Wall calf stretch", "Soleus stretch", "Achilles stretch"],
  },
  {
    id: "butterfly",
    name: "Butterfly",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 2, seconds: 45 },
    cue: "Soles together, heels pulled in toward the groin, sit tall; let the knees drop, then fold forward from the hips with a long back.",
    aliases: ["Butterfly stretch", "Bound angle"],
  },
  {
    id: "frog-stretch",
    name: "Frog stretch",
    section: "flexibility",
    regions: ["lower"],
    mode: "hold",
    equipment: ["mat"],
    dose: { sets: 2, seconds: 45 },
    cue: "On the forearms, knees wide in line with the hips, ankles straight behind the knees; ease the hips back toward the heels.",
    aliases: ["Frog pose", "Adductor stretch"],
  },
  {
    id: "hip-90-90",
    name: "90/90 hip stretch",
    section: "flexibility",
    focus: ["flexibility", "mobility"],
    regions: ["lower"],
    mode: "hold",
    perSide: true,
    dose: { sets: 2, seconds: 45 },
    cue: "Front and back legs both bent at 90°, sit tall on both sit bones; lean the chest over the front shin from the hips for the outer hip.",
    aliases: ["90-90", "Hip 90 90"],
  },
  {
    id: "jefferson-curl",
    name: "Jefferson curl",
    section: "flexibility",
    focus: ["flexibility", "mobility"],
    regions: ["core", "lower"],
    mode: "reps",
    equipment: ["chair", "kettlebell"],
    dose: { sets: 3, reps: 8, kg: 12 },
    cue: "Stand on the chair holding the kettlebell; roll down one vertebra at a time and back up. Go slow.",
  },
  // Pancake strength: the lengthened side (adductors, inner hamstrings) strong at the end of the range,
  // the shortened side (hip flexors) strong enough to pull the fold down without the hands
  {
    id: "pancake-good-morning",
    name: "Pancake good morning",
    section: "flexibility",
    focus: ["flexibility", "strength"],
    regions: ["lower", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 8 },
    variations: [
      { id: "bodyweight", name: "Arms crossed on the chest", dose: { sets: 3, reps: 10 } },
      { id: "plate", name: "Hugging a 5 kg plate", dose: { sets: 3, reps: 8, kg: 5 } },
      { id: "kettlebell", name: "Hugging the kettlebell", dose: { sets: 3, reps: 8, kg: 12 } },
    ],
    cue: "Sit in your widest straddle, knees and toes up, back long; fold forward from the hips over 3 s, pause 1–2 s at the bottom, then sit up with the back muscles. Add weight only while the depth holds.",
    aliases: ["Weighted pancake", "Straddle", "Adductor", "Loaded stretch"],
  },
  {
    id: "pancake-press",
    name: "Pancake contract–relax",
    section: "flexibility",
    focus: ["flexibility", "isometric"],
    regions: ["lower"],
    mode: "hold",
    dose: { sets: 4, seconds: 15 },
    cue: "In your deepest straddle, press the heels and the backs of the legs into the floor as if closing the legs, at 50–70 % effort. In each rest, breathe out, relax and sink a little deeper.",
    aliases: ["PNF", "End-range isometric", "Pancake", "Straddle", "Adductor"],
  },
  {
    id: "pancake-active",
    name: "Active pancake (hands-free)",
    section: "flexibility",
    focus: ["flexibility", "isometric"],
    regions: ["lower", "core"],
    mode: "hold",
    dose: { sets: 3, seconds: 10 },
    cue: "From your deepest straddle, take the hands off the floor, arms by the ears, and pull the chest down with the hip flexors; hold the lowest point you can keep with a long back.",
    aliases: ["Active flexibility", "End-range isometric", "Pancake", "Straddle", "Compression"],
  },
  {
    id: "straddle-leg-lift",
    name: "Straddle leg lifts",
    section: "flexibility",
    focus: ["strength", "flexibility"],
    regions: ["lower", "core"],
    mode: "reps",
    dose: { sets: 3, reps: 10 },
    variations: [
      { id: "alternating", name: "One leg at a time (count both)" },
      { id: "both", name: "Both legs", dose: { sets: 3, reps: 6 } },
    ],
    cue: "Sit tall in a wide straddle, hands on the floor in front of the hips; lift the leg off the floor with the knee and toes pointing up, 1 s at the top, lower slowly.",
    aliases: ["Pancake leg lifts", "Compression", "Straddle", "Active flexibility"],
  },
];

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

const STRENGTH_SECTIONS: SectionId[] = ["stances", "core", "push", "pull", "legs", "skills"];

/** What an exercise trains: its own `focus`, or else from its section. Isometric = it (or a
    variation) is a static hold, outside cardio (timed work), mobility and flexibility (stretches);
    physio rep work counts as strength, physio holds as isometric only. */
export function focusOf(e: Pick<Exercise, "focus" | "section" | "mode" | "variations">): Focus[] {
  if (e.focus) return e.focus;
  const hold = e.mode === "hold" || !!e.variations?.some((v) => v.mode === "hold");
  const out: Focus[] = [];
  if (STRENGTH_SECTIONS.includes(e.section) || (e.section === "physio" && e.mode === "reps")) out.push("strength");
  if (hold && (STRENGTH_SECTIONS.includes(e.section) || e.section === "physio")) out.push("isometric");
  if (e.section === "mobility") out.push("mobility");
  if (e.section === "flexibility") out.push("flexibility");
  if (e.section === "cardio") out.push("cardio");
  return out;
}
