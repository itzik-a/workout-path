/* Routines: list (#routines) and editor (#routines/<id>). */
import { IconBack, IconCheck, IconGrip, IconPlus } from "../components/Icons";
import { ChipGroup, Menu, Seg } from "../components/ui";
import { displayDays, dayName, liveRoutines, liveWorkout, rotationNext, routineSummary, weekday } from "../lib/routine";
import { showToast } from "../lib/toast";
import { useDragSort } from "../lib/useDragSort";
import { liveWorkouts } from "../state/actions";
import {
  addToRotation, createRoutine, deleteRoutine, duplicateRoutine, moveInRotation, moveRoutine, removeFromRotation, renameRoutine,
  restoreRoutine, setFollowing, setRotationNext, setRoutineDay, setRoutineKind, setTrainDays,
} from "../state/actions";
import { getState, useAppState, type AppState, type Routine } from "../state/store";

export const routineName = (r: Routine) => r.name.trim() || "Untitled routine";

function deleteWithUndo(r: Routine) {
  const wasFollowed = getState().following.includes(r.id);
  const snap = structuredClone(r);
  deleteRoutine(r.id);
  showToast(`Deleted ${routineName(r)}`, { label: "Undo", run: () => restoreRoutine(snap, wasFollowed) });
}

export function newRoutine() {
  location.hash = `#routines/${createRoutine()}`;
}

export function Routines({ sub }: { sub?: string }) {
  return sub ? <RoutineEditor id={sub} /> : <RoutineList />;
}

function RoutineList() {
  const s = useAppState();
  const list = liveRoutines(s);
  const sort = useDragSort(list.length, moveRoutine);
  const sortable = list.length > 1;
  return (
    <div className="workouts">
      <div className="page-head page-head-row">
        <div>
          <h1 className="display">Routines</h1>
          <p className="muted small">{list.length ? "Every routine you follow shows on Today." : "Put your workouts on a schedule"}</p>
        </div>
        {list.length > 0 && <button type="button" className="btn primary" onClick={newRoutine}><IconPlus /> New</button>}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <p><b>No routines yet.</b></p>
          <p className="muted small">A routine is either a weekly plan (a workout per day, rest days in between) or a rotation (A → B → C, then back to A) for training whenever you can.</p>
          <button type="button" className="btn primary" onClick={newRoutine}><IconPlus /> New routine</button>
        </div>
      ) : (
        <ul className={`workout-list${sortable ? " sortable" : ""}`}>
          {list.map((r, i) => {
            const active = s.following.includes(r.id);
            return (
              <li key={r.id} ref={sort.rowRef(i)} style={sort.rowStyle(i)} className={`card workout-card routine-card${active ? " active" : ""}${sort.dragging === i ? " is-dragging" : ""}`}>
                {sortable && <button type="button" className="handle" tabIndex={-1} aria-label={`Drag to reorder ${routineName(r)}`} {...sort.handleProps(i)}><IconGrip /></button>}
                <a className="workout-link" href={`#routines/${r.id}`}>
                  <span className="workout-name">{routineName(r)} {active && <span className="tag accent"><IconCheck /> Following</span>}</span>
                  <span className="muted small">{r.kind === "weekly" ? "Weekly" : "Rotation"}</span>
                  <span className="workout-preview">{routineSummary(s, r)}</span>
                </a>
                <span />
                <Menu
                  label={`More for ${routineName(r)}`}
                  items={[
                    active
                      ? { label: "Stop following", onSelect: () => setFollowing(r.id, false) }
                      : { label: "Follow this routine", onSelect: () => setFollowing(r.id, true) },
                    { label: "Move up", hidden: i === 0, onSelect: () => moveRoutine(i, i - 1) },
                    { label: "Move down", hidden: i === list.length - 1, onSelect: () => moveRoutine(i, i + 1) },
                    { label: "Duplicate", onSelect: () => { duplicateRoutine(r.id); showToast(`Duplicated ${routineName(r)}`); } },
                    { label: "Delete", danger: true, onSelect: () => deleteWithUndo(r) },
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

function RoutineEditor({ id }: { id: string }) {
  const s = useAppState();
  const r = s.routines.find((x) => x.id === id && !x.deletedAt);
  if (!r) {
    return (
      <div className="pick">
        <p><b>This routine isn't here.</b> It may have been deleted.</p>
        <a className="btn sm" href="#routines">Back to routines</a>
      </div>
    );
  }
  const active = s.following.includes(r.id);
  const workouts = liveWorkouts(s);

  return (
    <div className="routine-editor">
      <a className="back" href="#routines"><IconBack /> Routines</a>
      <header className="builder-head">
        <input
          className="title-input"
          value={r.name}
          placeholder="Routine name"
          aria-label="Routine name"
          onChange={(e) => renameRoutine(r.id, e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
        <Menu
          label="Routine options"
          items={[
            { label: "Stop following", hidden: !active, onSelect: () => setFollowing(r.id, false) },
            { label: "Duplicate routine", onSelect: () => { const nid = duplicateRoutine(r.id); if (nid) { location.hash = `#routines/${nid}`; showToast("Duplicated. You're editing the copy."); } } },
            { label: "Delete routine", danger: true, onSelect: () => { location.hash = "#routines"; deleteWithUndo(r); } },
          ]}
        />
      </header>

      <div className="routine-controls">
        <Seg
          label="Routine type"
          value={r.kind}
          options={[{ value: "weekly", label: "Weekly" }, { value: "rotation", label: "Rotation" }]}
          onChange={(kind) => setRoutineKind(r.id, kind)}
        />
        {active ? (
          <span className="tag accent following"><IconCheck /> Following · shows on Today</span>
        ) : (
          <button type="button" className="btn sm primary" onClick={() => setFollowing(r.id, true)}>Follow this routine</button>
        )}
      </div>
      <p className="muted small">
        {r.kind === "weekly"
          ? "Pick a workout for each day you train; leave the others as rest days."
          : "Workouts in order. Today shows the next one; saving it moves the rotation on, whatever day it is."}
        {active && r.kind === "weekly" && " Send to Garmin (on Workouts) puts it on the Garmin calendar."}
      </p>

      {workouts.length === 0 ? (
        <div className="card empty">
          <p><b>Build a workout first.</b></p>
          <a className="btn sm primary" href="#workouts">Go to Workouts</a>
        </div>
      ) : r.kind === "weekly" ? (
        <WeeklyDays s={s} r={r} />
      ) : (
        <>
          <RotationList s={s} r={r} />
          <TrainDays r={r} />
        </>
      )}
    </div>
  );
}

function WeeklyDays({ s, r }: { s: AppState; r: Routine }) {
  const workouts = liveWorkouts(s);
  const today = weekday(new Date());
  return (
    <ul className="card days">
      {displayDays().map((d) => {
        const w = liveWorkout(s, r.days?.[d]);
        return (
          <li key={d} className={`day-row${w ? "" : " rest"}`}>
            <span className="day-name">{dayName(d)}{d === today && <span className="tag accent">Today</span>}</span>
            <span className="select-box">
              <select aria-label={`${dayName(d)} workout`} value={w?.id ?? ""} onChange={(e) => setRoutineDay(r.id, d, e.target.value || null)}>
                <option value="">Rest day</option>
                {workouts.map((x) => <option key={x.id} value={x.id}>{x.name || "Untitled workout"}</option>)}
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A rotation's training days, so Send to Garmin can put it on the Garmin calendar. */
function TrainDays({ r }: { r: Routine }) {
  return (
    <div className="card train-days">
      <ChipGroup
        label="Training days, for the Garmin calendar"
        options={displayDays().map((d) => ({ value: String(d), label: dayName(d, "short") }))}
        value={(r.trainDays ?? []).map(String)}
        onChange={(v) => setTrainDays(r.id, v.map(Number))}
      />
      <p className="muted small">
        {r.trainDays?.length
          ? "Send to Garmin puts the next workout on each of these days for 4 weeks; the order moves on with the calendar."
          : "Pick the days you train, and Send to Garmin puts the next workout on each of them."}
      </p>
    </div>
  );
}

function RotationList({ s, r }: { s: AppState; r: Routine }) {
  const order = r.order ?? [];
  const next = rotationNext(s, r)?.i;
  const sort = useDragSort(order.length, (from, to) => moveInRotation(r.id, from, to));
  const workouts = liveWorkouts(s);
  return (
    <>
      {order.length > 0 && (
        <ol className="blocks rotation">
          {order.map((wid, i) => {
            const w = liveWorkout(s, wid);
            return (
              <li key={`${i}-${wid}`} ref={sort.rowRef(i)} style={sort.rowStyle(i)} className={sort.dragging === i ? "is-dragging" : undefined}>
                <div className={`item-card rot-row${i === next ? " next" : ""}`}>
                  <button type="button" className="handle" tabIndex={-1} aria-label="Drag to reorder" {...sort.handleProps(i)}><IconGrip /></button>
                  <span className="rot-main">
                    <span className="rot-num">{i + 1}</span>
                    <span className={w ? "item-name" : "item-name muted"}>{w ? w.name || "Untitled workout" : "Deleted workout"}</span>
                    {i === next && <span className="tag accent">Next</span>}
                  </span>
                  <Menu
                    label={`More for ${w?.name || "workout"}`}
                    items={[
                      { label: "Make this next", hidden: i === next || !w, onSelect: () => setRotationNext(r.id, i) },
                      { label: "Move up", hidden: i === 0, onSelect: () => moveInRotation(r.id, i, i - 1) },
                      { label: "Move down", hidden: i === order.length - 1, onSelect: () => moveInRotation(r.id, i, i + 1) },
                      { label: "Remove", danger: true, onSelect: () => removeFromRotation(r.id, i) },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <label className="select add-rot">
        <span className="stepper-label">Add to the rotation</span>
        <span className="select-box">
          <select value="" onChange={(e) => { if (e.target.value) addToRotation(r.id, e.target.value); }}>
            <option value="">Choose a workout…</option>
            {workouts.map((x) => <option key={x.id} value={x.id}>{x.name || "Untitled workout"}</option>)}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </label>
    </>
  );
}
