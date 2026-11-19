import { EXERCISES, SECTIONS } from "../data/catalog";
import type { View } from "../App";

const COPY: Record<Exclude<View, "catalog">, { title: string; body: string }> = {
  today: { title: "Today", body: "Your routine's next workout will show here, with a Start button and a quick start for any workout." },
  workouts: { title: "Workouts", body: "Build workouts from the catalog: straight sets, supersets and circuits, with your own doses and rest." },
  routines: { title: "Routines", body: "Put workouts on a weekly schedule or a rotation (A → B → C), and pick the one you're following." },
  history: { title: "History", body: "Every finished workout, plus your bests per exercise and how they change over time." },
};

export function Placeholder({ view }: { view: Exclude<View, "catalog"> }) {
  const { title, body } = COPY[view];
  return (
    <div className="placeholder">
      <div className="page-head">
        <h1 className="display">{title}</h1>
      </div>
      <div className="card">
        <span className="tag accent">Coming soon</span>
        <p>{body}</p>
        <p className="muted small">The catalog is ready: {EXERCISES.length} exercises in {SECTIONS.length} sections.</p>
        <a className="btn primary" href="#catalog">Browse the catalog</a>
      </div>
    </div>
  );
}
