/* Starter workouts. Each becomes an ordinary workout when picked (then edit it freely).
   Exercise / variation ids must exist in catalog.ts; doses override the catalog defaults. */
export interface TemplateItem {
  ex: string;
  v?: string;
  sets?: number;
  reps?: number;
  seconds?: number;
  minutes?: number;
  kg?: number;
  /** a reps exercise done for `seconds` instead (intervals, Tabata) */
  timed?: boolean;
  /** rest after each set (single) or after this exercise in a round (group), seconds */
  rest?: number;
}
export interface TemplateBlock { kind: "straight" | "superset" | "circuit"; rounds?: number; restBetween?: number; items: TemplateItem[] }
export interface Template { id: string; name: string; blurb: string; blocks: TemplateBlock[] }

const one = (item: TemplateItem): TemplateBlock => ({ kind: "straight", items: [item] });

export const TEMPLATES: Template[] = [
  {
    id: "iso-strength",
    name: "Iso strength",
    blurb: "Stances, wall and strap isometrics, plank. Hard holds, little equipment.",
    blocks: [
      one({ ex: "horse-stance", sets: 3, seconds: 45, rest: 60 }),
      one({ ex: "wall-sit", v: "two-leg", sets: 3, seconds: 45, rest: 60 }),
      one({ ex: "iso-strap-press", v: "overhead", sets: 3, seconds: 10, rest: 45 }),
      one({ ex: "iso-strap-press", v: "chest", sets: 3, seconds: 10, rest: 45 }),
      one({ ex: "iso-deadlift", sets: 3, seconds: 10, rest: 60 }),
      one({ ex: "iso-pull-up", v: "mid", sets: 3, seconds: 15, rest: 60 }),
      one({ ex: "plank", v: "forearm", sets: 3, seconds: 45, rest: 45 }),
    ],
  },
  {
    id: "golfers-elbow",
    name: "Golfer's elbow rehab",
    blurb: "Wrist flexors, deviation, forearm rotation, extensors, fingers and grip. Light load, slow and controlled, pain at most 3/10.",
    blocks: [
      one({ ex: "wrist-curl-eccentric", v: "full", sets: 3, reps: 15, rest: 30 }),
      one({ ex: "wrist-deviation", v: "radial", sets: 3, reps: 15, rest: 30 }),
      one({ ex: "wrist-deviation", v: "ulnar", sets: 3, reps: 15, rest: 30 }),
      one({ ex: "forearm-rotation", v: "pronation", sets: 3, reps: 12, rest: 30 }),
      one({ ex: "forearm-rotation", v: "supination", sets: 3, reps: 12, rest: 30 }),
      one({ ex: "wrist-extension-curl", sets: 3, reps: 15, rest: 30 }),
      one({ ex: "finger-extension", v: "band", sets: 3, reps: 15, rest: 30 }),
      one({ ex: "finger-extension", v: "hand-hold", sets: 3, seconds: 20, rest: 30 }),
      one({ ex: "grip-squeeze", v: "ball-reps", sets: 3, reps: 15, rest: 30 }),
    ],
  },
  {
    id: "push-pull",
    name: "Push + pull",
    blurb: "Warm-up, then push / pull supersets on the bar and dip bars.",
    blocks: [
      one({ ex: "cat-cow", sets: 1, reps: 10, rest: 0 }),
      one({ ex: "dog-flow", v: "flow", sets: 1, reps: 8, rest: 30 }),
      { kind: "superset", rounds: 3, restBetween: 90, items: [{ ex: "push-up", v: "standard", reps: 12 }, { ex: "pull-up", v: "strict", reps: 5 }] },
      { kind: "superset", rounds: 3, restBetween: 90, items: [{ ex: "dips", v: "parallel", reps: 8 }, { ex: "chin-up", reps: 6 }] },
      one({ ex: "hang", v: "active", sets: 2, seconds: 30, rest: 45 }),
    ],
  },
  {
    id: "core-skills",
    name: "Core & skills",
    blurb: "Handstand, crow, L-sit and planche practice, then a core circuit.",
    blocks: [
      one({ ex: "handstand", v: "chest-to-wall", sets: 5, seconds: 20, rest: 60 }),
      one({ ex: "crow", v: "crow", sets: 5, seconds: 15, rest: 45 }),
      one({ ex: "l-v-sit", v: "tuck", sets: 4, seconds: 10, rest: 60 }),
      one({ ex: "planche", v: "lean", sets: 4, seconds: 20, rest: 60 }),
      { kind: "circuit", rounds: 3, restBetween: 60, items: [
        { ex: "hollow-body", v: "tuck", seconds: 30 },
        { ex: "superman", v: "hold", seconds: 20 },
        { ex: "side-plank", v: "forearm", seconds: 30 },
      ] },
    ],
  },
  {
    id: "legs",
    name: "Legs & posterior chain",
    blurb: "Squat patterns on the chair, Nordics under the bed, Roman chair.",
    blocks: [
      one({ ex: "deep-squat-hold", sets: 2, seconds: 60, rest: 30 }),
      one({ ex: "bulgarian", sets: 3, reps: 8, rest: 60 }),
      one({ ex: "cossack", sets: 3, reps: 6, rest: 60 }),
      one({ ex: "box-squat", sets: 3, reps: 10, rest: 60 }),
      one({ ex: "nordic", v: "negative", sets: 3, reps: 5, rest: 90 }),
      one({ ex: "reverse-nordic", sets: 3, reps: 8, rest: 60 }),
      one({ ex: "roman-chair", v: "back", sets: 3, reps: 12, rest: 60 }),
    ],
  },
  {
    id: "flexibility",
    name: "Flexibility",
    blurb: "Hips, splits and pancake, with Jefferson curls on the 12 kg kettlebell.",
    blocks: [
      one({ ex: "hip-flexor-stretch", v: "half-kneeling", sets: 2, seconds: 30, rest: 15 }),
      one({ ex: "pigeon", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "jefferson-curl", sets: 3, reps: 8, kg: 12, rest: 60 }),
      one({ ex: "pancake", sets: 2, seconds: 60, rest: 30 }),
      one({ ex: "front-split", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "side-split", sets: 2, seconds: 60, rest: 30 }),
      one({ ex: "wall-split", sets: 1, seconds: 120, rest: 0 }),
    ],
  },
  {
    id: "leg-flexibility",
    name: "Leg flexibility",
    blurb: "Every leg stretch, from calves and hamstrings through the hips and groin to the splits. Ease in, breathe out into each hold.",
    blocks: [
      one({ ex: "deep-squat-hold", sets: 1, seconds: 60, rest: 15 }),
      one({ ex: "calf-stretch", v: "straight-knee", sets: 1, seconds: 30, rest: 10 }),
      one({ ex: "calf-stretch", v: "bent-knee", sets: 1, seconds: 30, rest: 10 }),
      one({ ex: "hamstring-stretch", v: "standing-fold", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "hip-flexor-stretch", v: "couch", sets: 2, seconds: 30, rest: 15 }),
      one({ ex: "hip-90-90", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "pigeon", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "butterfly", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "frog-stretch", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "hamstring-stretch", v: "seated-pike", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "pancake", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "front-split", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "side-split", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "wall-split", sets: 1, seconds: 120, rest: 0 }),
    ],
  },
  {
    id: "skills",
    name: "Skills",
    blurb: "Every skill: handstand, walk press, crow, planche, front lever and L-sit. Practice fresh, stop before form breaks.",
    blocks: [
      one({ ex: "handstand", v: "chest-to-wall", sets: 5, seconds: 20, rest: 60 }),
      one({ ex: "walk-press", sets: 3, reps: 5, rest: 60 }),
      one({ ex: "crow", v: "crow", sets: 5, seconds: 15, rest: 45 }),
      one({ ex: "planche", v: "lean", sets: 4, seconds: 20, rest: 60 }),
      one({ ex: "front-lever", v: "tuck", sets: 5, seconds: 10, rest: 90 }),
      one({ ex: "l-v-sit", v: "tuck", sets: 4, seconds: 10, rest: 60 }),
    ],
  },
  {
    id: "leg-isometrics",
    name: "Leg isometrics",
    blurb: "Calves, shins, quads, hamstrings, adductors and glutes: long holds, a wall, a chair, the strap and the bed.",
    blocks: [
      one({ ex: "calf-raise", v: "hold", sets: 3, seconds: 30, rest: 30 }),
      one({ ex: "tibialis-raise", v: "hold", sets: 3, seconds: 30, rest: 30 }),
      one({ ex: "wall-sit", v: "two-leg", sets: 3, seconds: 45, rest: 45 }),
      one({ ex: "spanish-squat", sets: 3, seconds: 45, rest: 60 }),
      one({ ex: "split-squat-hold", sets: 2, seconds: 30, rest: 30 }),
      one({ ex: "copenhagen-plank", v: "short", sets: 2, seconds: 20, rest: 30 }),
      one({ ex: "glute-bridge", v: "bridge-hold", sets: 3, seconds: 30, rest: 30 }),
      one({ ex: "nordic", v: "hold", rest: 60 }),
      one({ ex: "reverse-nordic", v: "hold", rest: 60 }),
    ],
  },
  {
    id: "cardio-circuit",
    name: "Cardio circuit",
    blurb: "Jump rope, then four rounds of frog jumps, push ups, plank and horse stance.",
    blocks: [
      one({ ex: "jump-rope", v: "basic", sets: 1, minutes: 3, rest: 60 }),
      { kind: "circuit", rounds: 4, restBetween: 60, items: [
        { ex: "frog-jump", reps: 10 },
        { ex: "push-up", v: "standard", reps: 10 },
        { ex: "plank", v: "forearm", seconds: 30 },
        { ex: "horse-stance", seconds: 30 },
      ] },
    ],
  },
  {
    id: "tabata",
    name: "Tabata",
    blurb: "Jump rope warm-up, then the classic 4 minutes: 8 × 20 s on, 10 s off, alternating frog jumps and push ups.",
    blocks: [
      one({ ex: "jump-rope", v: "basic", sets: 1, minutes: 3, rest: 60 }),
      { kind: "superset", rounds: 4, restBetween: 10, items: [
        { ex: "frog-jump", seconds: 20, timed: true, rest: 10 },
        { ex: "push-up", v: "standard", seconds: 20, timed: true },
      ] },
    ],
  },
];
