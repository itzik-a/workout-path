/* Progression ladders: an exercise's variations from easiest to hardest, each with the
   target (reps or seconds, in that variation's own unit) to reach before moving up.
   Rule: move up when your best set hits the target in 2 workouts in a row. */
export interface LadderStep { v: string; target: number }
export interface Ladder { ex: string; steps: LadderStep[] }

export const READY_STREAK = 2;

export const LADDERS: Ladder[] = [
  { ex: "planche", steps: [{ v: "lean", target: 30 }, { v: "tuck", target: 15 }, { v: "adv-tuck", target: 15 }, { v: "straddle", target: 10 }] },
  { ex: "front-lever", steps: [{ v: "tuck", target: 20 }, { v: "adv-tuck", target: 15 }, { v: "one-leg", target: 10 }, { v: "straddle", target: 10 }, { v: "full", target: 5 }] },
  { ex: "l-v-sit", steps: [{ v: "tuck", target: 20 }, { v: "one-leg", target: 15 }, { v: "l-sit", target: 15 }, { v: "v-sit", target: 10 }] },
  { ex: "handstand", steps: [{ v: "back-to-wall", target: 45 }, { v: "chest-to-wall", target: 60 }, { v: "freestanding", target: 30 }] },
  { ex: "crow", steps: [{ v: "crow", target: 30 }, { v: "crane", target: 20 }] },
  { ex: "dragon-flag", steps: [{ v: "tuck", target: 8 }, { v: "negative", target: 5 }, { v: "full", target: 5 }] },
  { ex: "hollow-body", steps: [{ v: "tuck", target: 30 }, { v: "full", target: 45 }] },
  { ex: "nordic", steps: [{ v: "negative", target: 6 }, { v: "full", target: 5 }] },
  { ex: "pull-up", steps: [{ v: "negative", target: 5 }, { v: "strict", target: 8 }] },
  { ex: "hang", steps: [{ v: "dead", target: 60 }, { v: "active", target: 45 }, { v: "l-sit", target: 20 }] },
  { ex: "push-up", steps: [{ v: "standard", target: 20 }, { v: "fingertip", target: 15 }, { v: "one-arm", target: 5 }] },
  { ex: "wall-sit", steps: [{ v: "two-leg", target: 90 }, { v: "single-leg", target: 45 }] },
  { ex: "glute-bridge", steps: [{ v: "bridge", target: 20 }, { v: "single-leg", target: 12 }] },
];

export const ladderFor = (exerciseId: string) => LADDERS.find((l) => l.ex === exerciseId);
