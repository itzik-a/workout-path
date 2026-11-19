import { EXERCISES, SECTIONS } from "../data/catalog";
import { useAppState } from "../state/store";

const COPY: Record<"history", { title: string; body: string }> = {
  history: { title: "History", body: "Every finished workout, plus your bests per exercise and how they change over time." },
};

export function Placeholder({ view }: { view: "history" }) {
  const { title, body } = COPY[view];
  const { sessions } = useAppState();
  return (
    <div className="placeholder">
      <div className="page-head">
        <h1 className="display">{title}</h1>
      </div>
      <div className="card">
        <span className="tag accent">Coming soon</span>
        <p>{body}</p>
        {view === "history" && sessions.length > 0 && (
          <p className="small"><b>{sessions.length} {sessions.length === 1 ? "workout" : "workouts"} saved so far.</b> Each exercise page in the catalog already shows your bests and last results.</p>
        )}
        <p className="muted small">The catalog is ready: {EXERCISES.length} exercises in {SECTIONS.length} sections.</p>
        <a className="btn primary" href="#catalog">Browse the catalog</a>
      </div>
    </div>
  );
}
