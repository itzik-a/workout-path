// Garmin exercise codes for the catalog, as Garmin Connect's workout editor names them:
// "CATEGORY/EXERCISE" (every code here is in that editor's list). When Garmin has nothing
// close, the category's own generic entry ("CORE/CORE", shown as just "Core"); the step's
// note still says what the exercise is. The FIT numbers (for the .fit file) are below.
import type { Exercise, SectionId } from "./catalog";

/** Keyed by exercise id, or "exercise:variation" when a variation is a different movement. */
export const GARMIN_CODES: Record<string, string> = {
  "frog-jump": "PLYO/JUMP_SQUAT",
  "jump-rope": "CARDIO/JUMP_ROPE",
  spinning: "INDOOR_BIKE/STATIONARY_BIKE",
  running: "RUN/RUN", "running:sprints": "RUN/SPRINT",
  "cat-cow": "WARM_UP/STRETCH_CAT_COW",
  "dog-flow": "WARM_UP/WARM_UP", "dog-flow:up-hold": "WARM_UP/STRETCH_COBRA", "dog-flow:down-hold": "WARM_UP/WARM_UP",
  "glute-bridge": "HIP_RAISE/HIP_RAISE",
  "kneeling-backbend": "WARM_UP/WARM_UP",
  "hip-flexor-stretch": "WARM_UP/STRETCH_HIP_FLEXOR_AND_QUAD",
  "deep-squat-hold": "WARM_UP/WARM_UP",
  "wrist-flexion-iso": "CURL/CURL", "pronation-iso": "CURL/CURL", "grip-squeeze": "CURL/CURL",
  "wrist-curl-eccentric": "CURL/DUMBBELL_WRIST_CURL", "wrist-extension-curl": "CURL/DUMBBELL_REVERSE_WRIST_CURL",
  "wrist-deviation": "CURL/CURL", "forearm-rotation": "CURL/CURL", "finger-extension": "CURL/CURL",
  "wrist-flexor-stretch": "WARM_UP/STRETCH_FOREARMS",
  "horse-stance": "SQUAT/SUMO_SQUAT", "wall-sit": "SQUAT/BODY_WEIGHT_WALL_SQUAT",
  "bow-stance": "LUNGE/LUNGE", "crane-stance": "HIP_STABILITY/HIP_STABILITY",
  plank: "PLANK/PLANK", "side-plank": "PLANK/SIDE_PLANK",
  "hollow-body": "HYPEREXTENSION/HOLLOW_HOLD_AND_ROLL", "hollow-body:rock": "CRUNCH/HOLLOW_ROCK",
  superman: "HYPEREXTENSION/SUPERMAN_FROM_FLOOR",
  "l-v-sit": "CORE/L_SIT", "l-v-sit:v-sit": "SIT_UP/V_UP",
  "dragon-flag": "CORE/CORE",
  "roman-chair": "CORE/GHD_BACK_EXTENSIONS", "roman-chair:obliques": "CORE/SIDE_BEND", "roman-chair:glutes": "HYPEREXTENSION/HYPEREXTENSION",
  "push-up": "PUSH_UP/PUSH_UP",
  dips: "TRICEPS_EXTENSION/BODY_WEIGHT_DIP", "dips:bench": "TRICEPS_EXTENSION/BENCH_DIP",
  "iso-strap-press": "SHOULDER_PRESS/SHOULDER_PRESS", "iso-strap-press:chest": "BENCH_PRESS/ISOMETRIC_BARBELL_BENCH_PRESS",
  "iso-strap-press:lateral": "LATERAL_RAISE/LATERAL_RAISE", "iso-strap-press:press-back": "SHOULDER_STABILITY/SHOULDER_STABILITY",
  "pull-up": "PULL_UP/PULL_UP", "chin-up": "PULL_UP/CHIN_UP", hang: "PULL_UP/PULL_UP", "hang:l-sit": "CORE/HANGING_L_SIT",
  "iso-pull-up": "PULL_UP/PULL_UP",
  "box-squat": "SQUAT/SQUAT", bulgarian: "LUNGE/DUMBBELL_BULGARIAN_SPLIT_SQUAT", cossack: "LUNGE/SIDE_LUNGE",
  nordic: "LEG_CURL/LEG_CURL", "reverse-nordic": "SQUAT/SQUAT", "iso-deadlift": "DEADLIFT/DEADLIFT",
  handstand: "TOTAL_BODY/TOTAL_BODY", crow: "TOTAL_BODY/TOTAL_BODY", "walk-press": "TOTAL_BODY/TOTAL_BODY",
  planche: "TOTAL_BODY/TOTAL_BODY", "front-lever": "CORE/MODIFIED_FRONT_LEVER",
  "wall-split": "WARM_UP/STRETCH_SIDE_SPLIT", "front-split": "WARM_UP/STRETCH_FRONT_SPLIT", "side-split": "WARM_UP/STRETCH_SIDE_SPLIT",
  pancake: "WARM_UP/STRETCH_STRADDLE", pigeon: "WARM_UP/STRETCH_PIGEON_POSE", "jefferson-curl": "DEADLIFT/DEADLIFT",
};

/** Custom exercises (and anything not above): the generic entry of a category from the section. */
const BY_SECTION: Record<SectionId, string> = {
  cardio: "CARDIO/CARDIO", mobility: "WARM_UP/WARM_UP", physio: "TOTAL_BODY/TOTAL_BODY", stances: "SQUAT/SQUAT",
  core: "CORE/CORE", push: "PUSH_UP/PUSH_UP", pull: "PULL_UP/PULL_UP", legs: "SQUAT/SQUAT",
  skills: "TOTAL_BODY/TOTAL_BODY", flexibility: "WARM_UP/WARM_UP",
};

export function garminCode(ex: Exercise | undefined, variationId?: string): string {
  if (!ex) return "TOTAL_BODY/TOTAL_BODY";
  return GARMIN_CODES[`${ex.id}:${variationId}`] ?? GARMIN_CODES[ex.id] ?? BY_SECTION[ex.section] ?? "TOTAL_BODY/TOTAL_BODY";
}

/** Every code above: Garmin's display name, then the FIT exercise category and name numbers
    (FIT SDK profile 21.x; no name number = the FIT file sets only the category). */
export const GARMIN_EXERCISES: Record<string, [name: string, fitCategory: number, fitName?: number]> = {
  "BENCH_PRESS/ISOMETRIC_BARBELL_BENCH_PRESS": ["Isometric Barbell Bench Press", 0, 11],
  "CARDIO/CARDIO": ["Cardio", 2],
  "CARDIO/JUMP_ROPE": ["Jump Rope", 2, 6],
  "CORE/CORE": ["Core", 5],
  "CORE/GHD_BACK_EXTENSIONS": ["GHD Back Extensions", 5, 41],
  "CORE/HANGING_L_SIT": ["Hanging L Sit", 5, 75],
  "CORE/L_SIT": ["L Sit", 5, 88],
  "CORE/MODIFIED_FRONT_LEVER": ["Modified Front Lever", 5, 20],
  "CORE/SIDE_BEND": ["Side Bend", 5, 8],
  "CRUNCH/HOLLOW_ROCK": ["Hollow Rock", 6, 24],
  "CURL/CURL": ["Curl", 7],
  "CURL/DUMBBELL_REVERSE_WRIST_CURL": ["Dumbbell Reverse Wrist Curl", 7, 17],
  "CURL/DUMBBELL_WRIST_CURL": ["Dumbbell Wrist Curl", 7, 18],
  "DEADLIFT/DEADLIFT": ["Deadlift", 8],
  "HIP_RAISE/HIP_RAISE": ["Hip Raise", 10, 11],
  "HIP_STABILITY/HIP_STABILITY": ["Hip Stability", 11],
  "HYPEREXTENSION/HOLLOW_HOLD_AND_ROLL": ["Hollow, Hold, and Roll", 13, 6],
  "HYPEREXTENSION/HYPEREXTENSION": ["Hyperextension", 13],
  "HYPEREXTENSION/SUPERMAN_FROM_FLOOR": ["Superman from Floor", 13, 29],
  "INDOOR_BIKE/STATIONARY_BIKE": ["Stationary Bike", 41, 3],
  "LATERAL_RAISE/LATERAL_RAISE": ["Lateral Raise", 14],
  "LEG_CURL/LEG_CURL": ["Leg Curl", 15, 0],
  "LUNGE/DUMBBELL_BULGARIAN_SPLIT_SQUAT": ["Dumbbell Bulgarian Split Squat", 17, 18],
  "LUNGE/LUNGE": ["Lunge", 17, 32],
  "LUNGE/SIDE_LUNGE": ["Side Lunge", 17, 61],
  "PLANK/PLANK": ["Plank", 19, 43],
  "PLANK/SIDE_PLANK": ["Side Plank", 19, 66],
  "PLYO/JUMP_SQUAT": ["Jump Squat", 20, 37],
  "PULL_UP/CHIN_UP": ["Chin-up", 21, 39],
  "PULL_UP/PULL_UP": ["Pull-up", 21, 38],
  "PUSH_UP/PUSH_UP": ["Push-up", 22, 77],
  "RUN/RUN": ["Run", 32, 0],
  "RUN/SPRINT": ["Sprint", 32, 3],
  "SHOULDER_PRESS/SHOULDER_PRESS": ["Shoulder Press", 24],
  "SHOULDER_STABILITY/SHOULDER_STABILITY": ["Shoulder Stability", 25],
  "SIT_UP/V_UP": ["V-up", 27, 31],
  "SQUAT/BODY_WEIGHT_WALL_SQUAT": ["Body-weight Wall Squat", 28, 20],
  "SQUAT/SQUAT": ["Squat", 28, 61],
  "SQUAT/SUMO_SQUAT": ["Sumo Squat", 28, 69],
  "TOTAL_BODY/TOTAL_BODY": ["Total Body", 29],
  "TRICEPS_EXTENSION/BENCH_DIP": ["Bench Dip", 30, 0],
  "TRICEPS_EXTENSION/BODY_WEIGHT_DIP": ["Body-weight Dip", 30, 2],
  "WARM_UP/STRETCH_CAT_COW": ["Cat Cow Stretch", 31, 38],
  "WARM_UP/STRETCH_COBRA": ["Cobra Stretch", 31, 40],
  "WARM_UP/STRETCH_FOREARMS": ["Forearm Stretch", 31, 41],
  "WARM_UP/STRETCH_FRONT_SPLIT": ["Front Split Stretch", 31, 43],
  "WARM_UP/STRETCH_HIP_FLEXOR_AND_QUAD": ["Hip Flexor and Quad Stretch", 31, 45],
  "WARM_UP/STRETCH_PIGEON_POSE": ["Pigeon Pose Stretch", 31, 59],
  "WARM_UP/STRETCH_SIDE_SPLIT": ["Side Split Stretch", 31, 66],
  "WARM_UP/STRETCH_STRADDLE": ["Straddle Stretch", 31, 68],
  "WARM_UP/WARM_UP": ["Warm-up", 31],
};
