import { useState } from "react";
import { Menu } from "../components/ui";
import { TemplatesSheet } from "../components/TemplatesSheet";
import { GarminSheet } from "../components/GarminSheet";
import { IconGrip, IconPlay, IconPlus } from "../components/Icons";
import { startWorkout } from "./Player";
import { showToast } from "../lib/toast";
import { useDragSort } from "../lib/useDragSort";
import { getExercise, workoutSummary } from "../lib/workout";
import { createWorkout, deleteWorkout, duplicateWorkout, liveWorkouts, moveWorkout, restoreWorkout } from "../state/actions";
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
  const [tpl, setTpl] = useState(false);
  const [garmin, setGarmin] = useState(false);
  const sort = useDragSort(list.length, moveWorkout);
  const sortable = list.length > 1;

  return (
    <div className="workouts">
      <div className="page-head page-head-row">
        <div>
          <h1 className="display">Workouts</h1>
          <p className="muted small">{list.length ? `${list.length} ${list.length === 1 ? "workout" : "workouts"}` : "Build your first one"}</p>
        </div>
        {list.length > 0 && (
          <div className="row-btns">
            <button type="button" className="btn ghost" onClick={() => setGarmin(true)}>Send to Garmin</button>
            <button type="button" className="btn ghost" onClick={() => setTpl(true)}>Templates</button>
            <button type="button" className="btn primary" onClick={newWorkout}><IconPlus /> New</button>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <p><b>No workouts yet.</b></p>
          <p className="muted small">Build one from the catalog: single exercises, supersets and circuits, with your own sets, reps, holds and rest.</p>
          <div className="row-btns">
            <button type="button" className="btn primary" onClick={newWorkout}><IconPlus /> New workout</button>
            <button type="button" className="btn ghost" onClick={() => setTpl(true)}>Start from a template</button>
          </div>
        </div>
      ) : (
        <ul className={`workout-list${sortable ? " sortable" : ""}`}>
          {list.map((w, i) => {
            const names = [...new Set(w.blocks.flatMap((b) => b.items.map((it) => getExercise(it.exerciseId, s.customExercises)?.name ?? "?")))];
            return (
              <li key={w.id} ref={sort.rowRef(i)} style={sort.rowStyle(i)} className={`card workout-card${sort.dragging === i ? " is-dragging" : ""}`}>
                {sortable && <button type="button" className="handle" tabIndex={-1} aria-label={`Drag to reorder ${workoutName(w)}`} {...sort.handleProps(i)}><IconGrip /></button>}
                <a className="workout-link" href={`#workouts/${w.id}`}>
                  <span className="workout-name">{workoutName(w)}</span>
                  <span className="muted small">{workoutSummary(w, s.customExercises)}</span>
                  {names.length > 0 && <span className="workout-preview">{names.join(", ")}</span>}
                </a>
                {w.blocks.length > 0 && (
                  <button type="button" className="icon-btn play-btn" aria-label={`Start ${workoutName(w)}`} onClick={() => startWorkout(w)}>
                    <IconPlay width={18} height={18} />
                  </button>
                )}
                <Menu
                  label={`More for ${workoutName(w)}`}
                  items={[
                    { label: "Move up", hidden: i === 0, onSelect: () => moveWorkout(i, i - 1) },
                    { label: "Move down", hidden: i === list.length - 1, onSelect: () => moveWorkout(i, i + 1) },
                    { label: "Duplicate", onSelect: () => { duplicateWorkout(w.id); showToast(`Duplicated ${workoutName(w)}`); } },
                    { label: "Delete", danger: true, onSelect: () => deleteWithUndo(w) },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
      {tpl && <TemplatesSheet onClose={() => setTpl(false)} />}
      {garmin && <GarminSheet which="all" onClose={() => setGarmin(false)} />}
    </div>
  );
}
