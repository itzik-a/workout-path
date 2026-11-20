/* Add workouts to Garmin Connect's Workouts list, so the watch's own workout player runs them.
   Garmin's official workout API is only for approved companies, so this uses what the
   connect.garmin.com website itself calls (unofficial, may change): POST
   /gc-api/workout-service/workout with the page's CSRF token and the signed-in cookies.
   That only works on that site, so the app copies the workouts (src/lib/garminRunner.ts runs
   them there, from a bookmark or the console). Nothing is sent from here. */
import type { Exercise } from "../data/catalog";
import { liveWorkouts } from "../state/actions";
import type { AppState, Workout } from "../state/store";
import { garminSeconds, garminTree, type GarminStep } from "./garmin";
import { calendarPlan, type CalendarPlan } from "./garminPlan";
import { RUNNER_VERSION, type GarminPayload } from "./garminRunner";

const STRENGTH = { sportTypeId: 5, sportTypeKey: "strength_training", displayOrder: 5 };
const STEP = {
  interval: { stepTypeId: 3, stepTypeKey: "interval", displayOrder: 3 },
  rest: { stepTypeId: 5, stepTypeKey: "rest", displayOrder: 5 },
  repeat: { stepTypeId: 6, stepTypeKey: "repeat", displayOrder: 6 },
};
const END = {
  lap: { conditionTypeId: 1, conditionTypeKey: "lap.button", displayOrder: 1, displayable: true },
  time: { conditionTypeId: 2, conditionTypeKey: "time", displayOrder: 2, displayable: true },
  iterations: { conditionTypeId: 7, conditionTypeKey: "iterations", displayOrder: 7, displayable: false },
  reps: { conditionTypeId: 10, conditionTypeKey: "reps", displayOrder: 10, displayable: true },
};
const NO_TARGET = { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target", displayOrder: 1 };
/** Garmin keeps weight in grams, tagged kilogram. */
const KG = { unitId: 8, unitKey: "kilogram", factor: 1000 };

/** Marks workouts made here, so a later version can find and update them. */
export const connectTag = (w: Workout) => `wp:${w.id}`;

export function connectWorkout(w: Workout, custom?: Exercise[]) {
  const tree = garminTree(w, custom);
  let order = 0, group = 0;
  const step = (s: GarminStep, child: number | null) => {
    const end = "reps" in s.end ? { endCondition: END.reps, endConditionValue: s.end.reps }
      : "seconds" in s.end ? { endCondition: END.time, endConditionValue: s.end.seconds }
      : { endCondition: END.lap };
    const base = { type: "ExecutableStepDTO", stepOrder: ++order, childStepId: child, targetType: NO_TARGET, ...end };
    if (s.kind === "rest") return { ...base, stepType: STEP.rest };
    const [category, exerciseName] = (s.code ?? "TOTAL_BODY/TOTAL_BODY").split("/");
    return {
      ...base, stepType: STEP.interval, category, exerciseName,
      // The watch shows Garmin's exercise name; the note keeps mine (and the side) plus the cue.
      description: [s.name, s.cue].filter(Boolean).join(" — ").slice(0, 500),
      ...(s.kg ? { weightValue: s.kg * 1000, weightUnit: KG } : {}),
    };
  };
  const workoutSteps = tree.map((n) => {
    if (n.kind !== "repeat") return step(n, null);
    const id = ++group;
    const head = {
      type: "RepeatGroupDTO", stepOrder: ++order, childStepId: id, stepType: STEP.repeat,
      numberOfIterations: n.times, endCondition: END.iterations, endConditionValue: n.times,
      smartRepeat: false, skipLastRestStep: n.skipLastRest,
    };
    return { ...head, workoutSteps: n.steps.map((s) => step(s, id)) };
  });
  return {
    workoutName: (w.name || "Workout").slice(0, 80),
    description: `Made in Workout Path (${connectTag(w)})`,
    sportType: STRENGTH,
    estimatedDurationInSecs: garminSeconds(tree),
    workoutSegments: [{ segmentOrder: 1, sportType: STRENGTH, workoutSteps }],
  };
}

/** What to send: one workout, or every workout plus the calendar from my followed routines. */
export function garminPayload(s: AppState, which: Workout | "all", now = new Date()): { payload: GarminPayload; plan?: CalendarPlan } {
  const custom = s.customExercises;
  const item = (w: Workout) => ({ tag: connectTag(w), name: w.name || "Workout", body: connectWorkout(w, custom) });
  if (which !== "all") return { payload: { v: RUNNER_VERSION, all: false, workouts: [item(which)] } };
  const list = liveWorkouts(s).filter((w) => w.blocks.length);
  const plan = calendarPlan(s, now);
  const tags = new Map(list.map((w) => [w.id, connectTag(w)]));
  const days = plan.days.flatMap((d) => (tags.has(d.workoutId) ? [{ date: d.date, tag: tags.get(d.workoutId)! }] : []));
  return { payload: { v: RUNNER_VERSION, all: true, workouts: list.map(item), calendar: { from: plan.from, to: plan.to, days } }, plan };
}
