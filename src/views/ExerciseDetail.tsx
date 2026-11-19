import { useState, type FormEvent } from "react";
import { EQUIPMENT_LABEL, MODE_LABEL, REGION_LABEL, sectionById, type Exercise } from "../data/catalog";
import { IconBack, IconChevronRight, IconClose, IconExternal } from "../components/Icons";
import { Menu } from "../components/ui";
import { showToast } from "../lib/toast";
import { isCustom } from "../lib/workout";
import { ladderRows } from "../lib/progress";
import { formatValue } from "../lib/history";
import { READY_STREAK } from "../data/progressions";
import { addExerciseLink, deleteCustomExercise, removeExerciseLink, restoreCustomExercise, setExerciseNote } from "../state/actions";
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
    max((x) => x.seconds) && `${formatSeconds(max((x) => x.seconds))} ${all.some((x) => x.seconds && !x.mode) ? "hold" : "timed"}`,
    max((x) => x.minutes) && `${max((x) => x.minutes)} min`,
    max((x) => x.kg) && `${max((x) => x.kg)} kg`,
  ].filter(Boolean).join(" · ");
  const last = mine[0];
  const section = sectionById(ex.section);

  return (
    <article className="detail" aria-labelledby="ex-title">
      <a className="back" href="#catalog"><IconBack /> Catalog</a>

      <header className="builder-head">
        <div className="detail-head">
          <p className="eyebrow">{section.name}{isCustom(ex.id) && " · Custom"}{ex.deletedAt && " · Deleted"}</p>
          <h1 id="ex-title" className="display">{ex.name}</h1>
          {ex.aliases?.length ? <p className="muted small">Also called {ex.aliases.join(", ")}</p> : null}
        </div>
        {isCustom(ex.id) && !ex.deletedAt && (
          <>
            <a className="btn sm" href={`#catalog/${ex.id}/edit`}>Edit</a>
            <Menu
              label={`More for ${ex.name}`}
              items={[{ label: "Delete exercise", danger: true, onSelect: () => {
                const snap = structuredClone(ex);
                location.hash = "#catalog";
                deleteCustomExercise(ex.id);
                showToast(`Deleted ${ex.name}`, { label: "Undo", run: () => restoreCustomExercise(snap) });
              } }]}
            />
          </>
        )}
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

      <Progression id={ex.id} />

      <MyNotes id={ex.id} />

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
        {last && (
          <a className="link-row" href={`#history/exercise/${ex.id}`}>Progress chart and every workout <IconChevronRight /></a>
        )}
      </section>
    </article>
  );
}

const withScheme = (u: string) => (/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`);
const linkLabel = (l: { url: string; label?: string }) => {
  if (l.label) return l.label;
  try { return new URL(l.url).hostname.replace(/^www\./, ""); } catch { return l.url; }
};

/** My note and links on this exercise (videos, tutorials); synced with everything else. */
function MyNotes({ id }: { id: string }) {
  const { exerciseNotes } = useAppState();
  const n = exerciseNotes[id];
  const [note, setNote] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const u = withScheme(url.trim());
    try {
      const p = new URL(u);
      if (p.protocol !== "https:" && p.protocol !== "http:") throw new Error();
    } catch { setErr("That doesn't look like a web address."); return; }
    addExerciseLink(id, u, label);
    setUrl(""); setLabel(""); setErr("");
  };

  return (
    <section className="card" aria-labelledby="notes-title">
      <h2 id="notes-title">My notes &amp; links</h2>
      <label className="note">
        <span className="visually-hidden">My note</span>
        <textarea
          rows={2}
          value={note ?? n?.note ?? ""}
          placeholder="Anything to remember: setup, what to feel, next goal"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== null) { setExerciseNote(id, note); setNote(null); } }}
        />
      </label>
      {n?.links?.length ? (
        <ul className="links">
          {n.links.map((l, i) => (
            <li key={`${i}-${l.url}`}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">{linkLabel(l)} <IconExternal /></a>
              <button type="button" className="icon-btn subtle" aria-label={`Remove link ${linkLabel(l)}`} onClick={() => removeExerciseLink(id, i)}><IconClose /></button>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="link-form" onSubmit={add}>
        <input className="text-input" type="text" inputMode="url" placeholder="Paste a link (video, tutorial)" aria-label="Link" value={url} onChange={(e) => setUrl(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <input className="text-input" placeholder="Label (optional)" aria-label="Link label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="submit" className="btn sm" disabled={!url.trim()}>Add link</button>
      </form>
      {err && <p className="form-error" role="alert">{err}</p>}
    </section>
  );
}

/** The exercise's ladder: steps, targets, my best at each, where I am. */
function Progression({ id }: { id: string }) {
  const { sessions, customExercises } = useAppState();
  const lad = ladderRows(id, sessions, customExercises);
  if (!lad) return null;
  return (
    <section className="card" aria-labelledby="prog-title">
      <div className="card-head">
        <h2 id="prog-title">Progression</h2>
        {lad.ready && <span className="tag good">Ready to move up</span>}
      </div>
      <p className="muted small">Move up when your best set hits the target in {READY_STREAK} workouts in a row.</p>
      <ol className="ladder">
        {lad.rows.map((r, i) => (
          <li key={r.v} className={[r.current && "current", r.done && "done"].filter(Boolean).join(" ")}>
            <span className="ladder-num" aria-hidden="true">{r.done && !r.current ? "✓" : i + 1}</span>
            <span className="ladder-main">
              <span className="var-name">{r.name}{r.current && <span className="tag accent">You're here</span>}</span>
              <span className="muted small">Target {formatValue(r.target, r.mode)}{r.best ? ` · best ${formatValue(r.best, r.mode)}` : ""}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
