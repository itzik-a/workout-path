import { Menu } from "../components/ui";
import { IconPlus } from "../components/Icons";
import { showToast } from "../lib/toast";
import { getExercise, workoutSummary } from "../lib/workout";
import { createWorkout, deleteWorkout, duplicateWorkout, liveWorkouts, restoreWorkout } from "../state/actions";
import { useAppState, type Workout } from "../state/store";
import { Builder } from "./Builder";

export function Workouts({ sub }: { sub?: string }) {
  return sub ? <Builder id={sub} /> : <WorkoutList />;
}

export const workoutName = (w: Workout) => w.name.trim() || "Untitled workout";

/** Delete with a 6 s Undo. */
export function deleteWithUndo(w: Workout) {
  const snap = structuredClone(w);
  deleteWorkout(w.id);
  showToast(`Deleted ${workoutName(w)}`, { label: "Undo", run: () => restoreWorkout(snap) });
}

export function newWorkout() {
  location.hash = `#workouts/${createWorkout()}`;
}

function WorkoutList() {
  const s = useAppState();
  const list = liveWorkouts(s);

  return (
    <div className="workouts">
      <div className="page-head page-head-row">
        <div>
          <h1 className="display">Workouts</h1>
          <p className="muted small">{list.length ? `${list.length} ${list.length === 1 ? "workout" : "workouts"}` : "Build your first one"}</p>
        </div>
        {list.length > 0 && <button type="button" className="btn primary" onClick={newWorkout}><IconPlus /> New</button>}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <p><b>No workouts yet.</b></p>
          <p className="muted small">Build one from the catalog: single exercises, supersets and circuits, with your own sets, reps, holds and rest.</p>
          <button type="button" className="btn primary" onClick={newWorkout}><IconPlus /> New workout</button>
        </div>
      ) : (
        <ul className="workout-list">
          {list.map((w) => {
            const names = [...new Set(w.blocks.flatMap((b) => b.items.map((it) => getExercise(it.exerciseId, s.customExercises)?.name ?? "?")))];
            return (
              <li key={w.id} className="card workout-card">
                <a className="workout-link" href={`#workouts/${w.id}`}>
                  <span className="workout-name">{workoutName(w)}</span>
                  <span className="muted small">{workoutSummary(w, s.customExercises)}</span>
                  {names.length > 0 && <span className="workout-preview">{names.join(", ")}</span>}
                </a>
                <Menu
                  label={`More for ${workoutName(w)}`}
                  items={[
                    { label: "Duplicate", onSelect: () => { duplicateWorkout(w.id); showToast(`Duplicated ${workoutName(w)}`); } },
                    { label: "Delete", danger: true, onSelect: () => deleteWithUndo(w) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
