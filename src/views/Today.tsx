/* Today: what each followed routine says to do, quick start for any workout, last workout. */
import { useEffect, useState } from "react";
import { IconCheck, IconPlay } from "../components/Icons";
import { formatDuration } from "../lib/format";
import { relativeDay, rotationNext, todayPlans, weekStrip, liveWorkout, type TodayPlan } from "../lib/routine";
import { getExercise, workoutSummary } from "../lib/workout";
import { liveWorkouts, setRotationNext } from "../state/actions";
import { useAppState, type AppState, type Session, type Workout } from "../state/store";
import { startWorkout } from "./Player";
import { routineName, newRoutine } from "./Routines";
import { newWorkout } from "./Workouts";

export function Today() {
  const s = useAppState();
  // Re-read the date when the app comes back (it may be a new day).
  const [, setTick] = useState(0);
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") setTick((n) => n + 1); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const now = new Date();
  const plans = todayPlans(s, now);
  const workouts = liveWorkouts(s);
  const last = [...s.sessions].sort((a, b) => b.startedAt - a.startedAt)[0];

  return (
    <div className="today">
      <div className="page-head">
        <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="display">Today</h1>
      </div>

      {plans.length ? plans.map((p) => <PlanCard key={p.routine.id} s={s} plan={p} />) : <NoRoutine hasWorkouts={workouts.length > 0} />}

      {workouts.length > 0 && (
        <section className="group" aria-labelledby="qs-title">
          <div className="group-head"><h2 id="qs-title">Quick start</h2></div>
          <ul className="card ex-list">
            {workouts.map((w) => (
              <li key={w.id} className="qs-row">
                <a className="ex-row" href={`#workouts/${w.id}`}>
                  <span className="ex-main">
                    <span className="ex-name">{w.name || "Untitled workout"}</span>
                    <span className="ex-meta">{workoutSummary(w, s.customExercises)}</span>
                  </span>
                </a>
                {w.blocks.length > 0 && (
                  <button type="button" className="icon-btn play-btn" aria-label={`Start ${w.name || "workout"}`} onClick={() => startWorkout(w)}>
                    <IconPlay width={18} height={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {last && (
        <p className="muted small last-workout">
          Last workout: <b>{last.workoutName || liveWorkout(s, last.workoutId)?.name || "Workout"}</b> · {relativeDay(last.date, now)}{sessionMeta(last)}
        </p>
      )}
    </div>
  );
}

const sessionMeta = (x: Session) => {
  const sets = x.sets.filter((y) => !y.skipped).length;
  return `${x.endedAt ? ` · ${formatDuration(x.endedAt - x.startedAt)}` : ""} · ${sets} ${sets === 1 ? "set" : "sets"}`;
};

function NoRoutine({ hasWorkouts }: { hasWorkouts: boolean }) {
  return (
    <div className="card today-card">
      <p className="eyebrow">No routine</p>
      <h2 className="today-title">{hasWorkouts ? "Follow a routine" : "Build your first workout"}</h2>
      <p className="muted small">
        {hasWorkouts
          ? "Put your workouts on a weekly plan or a rotation, and Today will tell you what's next. Or start any workout below."
          : "Pick exercises from the catalog, set your sets, reps, holds and rest, then put it on a routine."}
      </p>
      <div className="row-btns">
        {hasWorkouts
          ? <button type="button" className="btn primary" onClick={newRoutine}>Set up a routine</button>
          : <button type="button" className="btn primary" onClick={newWorkout}>New workout</button>}
        <a className="btn ghost" href="#catalog">Browse the catalog</a>
      </div>
    </div>
  );
}

function PlanCard({ s, plan }: { s: AppState; plan: TodayPlan }) {
  const { routine: r, workout: w, done } = plan;
  const kind = r.kind === "weekly" ? "Weekly" : "Rotation";
  const head = <p className="eyebrow"><a href={`#routines/${r.id}`}>{routineName(r)}</a> · {kind}</p>;

  // Weekly, already done today.
  if (r.kind === "weekly" && done && w) {
    return (
      <div className="card today-card done">
        {head}
        <h2 className="today-title"><span className="done-mark"><IconCheck width={18} height={18} /></span> {w.name || "Workout"} done</h2>
        <p className="muted small">{relativeDay(done.date)}{sessionMeta(done)}</p>
        {plan.next && <p className="small">Next: <b>{plan.next.when}</b> · {plan.next.w.name || "Untitled workout"}</p>}
        <WeekStrip s={s} plan={plan} />
      </div>
    );
  }

  // Weekly rest day.
  if (r.kind === "weekly" && !w) {
    return (
      <div className="card today-card">
        {head}
        <h2 className="today-title">Rest day</h2>
        <p className="muted small">{plan.next ? <>Next: <b>{plan.next.when}</b> · {plan.next.w.name || "Untitled workout"}</> : <>Nothing is scheduled yet. <a href={`#routines/${r.id}`}>Plan the week</a>.</>}</p>
        <WeekStrip s={s} plan={plan} />
      </div>
    );
  }

  // Rotation with nothing in it.
  if (!w) {
    return (
      <div className="card today-card">
        {head}
        <h2 className="today-title">Add workouts to the rotation</h2>
        <a className="btn primary" href={`#routines/${r.id}`}>Edit routine</a>
      </div>
    );
  }

  return (
    <div className="card today-card">
      {head}
      {r.kind === "rotation" && done && (
        <p className="small done-line"><span className="done-mark"><IconCheck width={14} height={14} /></span> Done today: <b>{done.workoutName || "Workout"}</b>{sessionMeta(done)}</p>
      )}
      <h2 className="today-title">{w.name || "Untitled workout"}</h2>
      <p className="muted small">
        {r.kind === "rotation" && plan.rotation ? `${done ? "Up next" : "Next"} · ${plan.rotation.i + 1} of ${plan.rotation.n} · ` : ""}
        {workoutSummary(w, s.customExercises)}
      </p>
      <ExerciseChips s={s} w={w} />
      <div className="row-btns">
        <button type="button" className="btn primary today-start" onClick={() => startWorkout(w)}><IconPlay width={18} height={18} /> Start</button>
        <a className="btn ghost" href={`#workouts/${w.id}`}>Edit</a>
        {r.kind === "rotation" && plan.rotation && plan.rotation.n > 1 && (
          <button type="button" className="btn ghost" onClick={() => setRotationNext(r.id, plan.rotation!.i + 1)}>Skip to next</button>
        )}
      </div>
      {r.kind === "weekly" ? <WeekStrip s={s} plan={plan} /> : <RotationStrip s={s} plan={plan} />}
    </div>
  );
}

function ExerciseChips({ s, w }: { s: AppState; w: Workout }) {
  const names = [...new Set(w.blocks.flatMap((b) => b.items.map((it) => getExercise(it.exerciseId, s.customExercises)?.name ?? "?")))];
  if (!names.length) return null;
  return <ul className="ex-chips">{names.map((n) => <li key={n} className="tag">{n}</li>)}</ul>;
}

function WeekStrip({ s, plan }: { s: AppState; plan: TodayPlan }) {
  const days = weekStrip(s, plan.routine);
  return (
    <ol className="strip" aria-label="This week">
      {days.map((d) => (
        <li key={d.date} className={[d.today && "today", d.done && "done", !d.w && "rest", d.past && !d.done && d.w && "missed"].filter(Boolean).join(" ")}>
          <span className="strip-day">{d.label}</span>
          <span className="strip-mark">{d.done ? <IconCheck width={14} height={14} /> : d.w ? (d.w.name || "W").slice(0, 3) : "–"}</span>
          <span className="visually-hidden">{d.w ? d.w.name : "Rest"}{d.done ? ", done" : ""}</span>
        </li>
      ))}
    </ol>
  );
}

function RotationStrip({ s, plan }: { s: AppState; plan: TodayPlan }) {
  const order = plan.routine.order ?? [];
  const next = rotationNext(s, plan.routine)?.i;
  if (order.length < 2) return null;
  return (
    <ol className="rot-strip" aria-label="Rotation">
      {order.flatMap((id, i) => {
        const w = liveWorkout(s, id);
        if (!w) return [];
        const pill = <li key={`${i}-${id}`} className={i === next ? "next" : undefined}>{w.name || "Untitled"}</li>;
        return i ? [<li key={`a${i}`} className="rot-arrow" aria-hidden="true">→</li>, pill] : [pill];
      })}
    </ol>
  );
}
