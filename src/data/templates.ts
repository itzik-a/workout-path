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
    id: "leg-flexibility",
    name: "Leg flexibility",
    blurb: "Every leg stretch, from calves and hamstrings through the hips and groin to the splits, with Jefferson curls on the 12 kg kettlebell. Ease in, breathe out into each hold.",
    blocks: [
      one({ ex: "deep-squat-hold", sets: 1, seconds: 60, rest: 15 }),
      one({ ex: "calf-stretch", v: "straight-knee", sets: 1, seconds: 30, rest: 10 }),
      one({ ex: "calf-stretch", v: "bent-knee", sets: 1, seconds: 30, rest: 10 }),
      one({ ex: "hamstring-stretch", v: "standing-fold", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "hip-flexor-stretch", v: "half-kneeling", sets: 2, seconds: 30, rest: 15 }),
      one({ ex: "hip-flexor-stretch", v: "couch", sets: 2, seconds: 30, rest: 15 }),
      one({ ex: "hip-90-90", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "pigeon", sets: 2, seconds: 60, rest: 15 }),
      one({ ex: "butterfly", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "frog-stretch", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "hamstring-stretch", v: "seated-pike", sets: 2, seconds: 45, rest: 15 }),
      one({ ex: "jefferson-curl", sets: 3, reps: 8, kg: 12, rest: 60 }),
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
];
