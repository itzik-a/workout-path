import { EQUIPMENT_LABEL, MODE_LABEL, REGION_LABEL, sectionById, type Exercise } from "../data/catalog";
import { IconBack } from "../components/Icons";
import { formatDose, formatSeconds, variationDose } from "../lib/format";
import { groupSets, setsLine } from "./Player";
import { useAppState, type SetLog } from "../state/store";

export function ExerciseDetail({ ex }: { ex: Exercise }) {
  const { sessions, customExercises } = useAppState();
  const mine = sessions
    .map((s) => ({ s, sets: s.sets.filter((x) => x.exerciseId === ex.id && !x.skipped) }))
    .filter((x) => x.sets.length)
    .sort((a, b) => b.s.startedAt - a.s.startedAt);
  const all = mine.flatMap((x) => x.sets);
  const max = (f: (x: SetLog) => number | undefined) => Math.max(0, ...all.map((x) => f(x) ?? 0));
  const best = [
    max((x) => x.reps) && `${max((x) => x.reps)} reps`,
    max((x) => x.seconds) && `${formatSeconds(max((x) => x.seconds))} hold`,
    max((x) => x.minutes) && `${max((x) => x.minutes)} min`,
    max((x) => x.kg) && `${max((x) => x.kg)} kg`,
  ].filter(Boolean).join(" · ");
  const last = mine[0];
  const section = sectionById(ex.section);

  return (
    <article className="detail" aria-labelledby="ex-title">
      <a className="back" href="#catalog"><IconBack /> Catalog</a>

      <header className="detail-head">
        <p className="eyebrow">{section.name}</p>
        <h1 id="ex-title" className="display">{ex.name}</h1>
        {ex.aliases?.length ? <p className="muted small">Also called {ex.aliases.join(", ")}</p> : null}
      </header>

      {ex.cue && <p className="cue">{ex.cue}</p>}

      <dl className="facts card">
        <div><dt>Default</dt><dd>{formatDose(ex.dose, ex.mode, ex.perSide)}</dd></div>
        <div><dt>Type</dt><dd>{MODE_LABEL[ex.mode]}{ex.mode === "hold" ? " (seconds)" : ex.mode === "time" ? " (minutes)" : ""}</dd></div>
        <div><dt>Body</dt><dd>{ex.regions.map((r) => REGION_LABEL[r]).join(", ")}</dd></div>
        <div><dt>Equipment</dt><dd>{ex.equipment?.length ? ex.equipment.map((q) => EQUIPMENT_LABEL[q]).join(", ") : "None"}</dd></div>
      </dl>

      {ex.variations?.length ? (
        <section className="card" aria-labelledby="var-title">
          <h2 id="var-title">Variations</h2>
          <ul className="variations">
            {ex.variations.map((v) => {
              const { mode, dose, overridden } = variationDose(ex, v);
              return (
                <li key={v.id}>
                  <span className="var-name">{v.name}</span>
                  <span className={overridden ? "var-dose" : "var-dose muted"}>
                    {formatDose(dose, mode, ex.perSide)}
                    {mode !== ex.mode && <span className={`tag mode-${mode}`}>{MODE_LABEL[mode]}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="card" aria-labelledby="hist-title">
        <h2 id="hist-title">My history</h2>
        {!last ? (
          <p className="muted small">Nothing logged yet. After you finish a workout with this exercise, your bests and recent results show here.</p>
        ) : (
          <dl className="facts">
            <div><dt>Best</dt><dd>{best}</dd></div>
            <div><dt>Workouts</dt><dd>{mine.length}</dd></div>
            <div className="wide"><dt>Last · {last.s.date}</dt><dd>
              {groupSets(last.sets, customExercises).map((g) => <span key={g.name} className="last-line">{g.name}: {setsLine(g.mode, g.sets)}</span>)}
            </dd></div>
          </dl>
        )}
      </section>
    </article>
  );
}
