/* History: #history (workouts / exercises), #history/<session id>, #history/exercise/<exercise id>. */
import { useState } from "react";
import { MODE_LABEL, sectionById } from "../data/catalog";
import { IconBack, IconChevronRight } from "../components/Icons";
import { LineChart } from "../components/LineChart";
import { Menu, Seg, useSessionState } from "../components/ui";
import { formatDuration } from "../lib/format";
import {
  doneSets, formatValue, longDate, loggedExercises, newestFirst, periodStats, seriesFor, sessionMs, shortDate,
  tracksFor, weekStartDate, type Point, type Track,
} from "../lib/history";
import { dateStr, displayDays, dayName, liveWorkout, relativeDay } from "../lib/routine";
import { showToast } from "../lib/toast";
import { getExercise } from "../lib/workout";
import { deleteSession, restoreSession, updateSession } from "../state/actions";
import { useAppState, type AppState, type Session } from "../state/store";
import { groupSets, setsLine } from "./Player";

export function History({ sub }: { sub?: string }) {
  if (sub?.startsWith("exercise/")) return <ExerciseProgress id={sub.slice("exercise/".length)} />;
  if (sub) return <SessionDetail id={sub} />;
  return <HistoryHome />;
}

/** "today", "yesterday", "Tuesday", "Nov 3" */
const lastDone = (date: string) => { const r = relativeDay(date); return r === "Today" || r === "Yesterday" ? r.toLowerCase() : r; };

const sessionName = (s: AppState, x: Session) => x.workoutName || liveWorkout(s, x.workoutId)?.name || "Workout";

function HistoryHome() {
  const s = useAppState();
  const [tab, setTab] = useSessionState<{ v: "workouts" | "exercises" }>("workoutPath.historyTab", { v: "workouts" });
  const sessions = newestFirst(s.sessions);

  if (!sessions.length) {
    return (
      <div className="history">
        <div className="page-head"><h1 className="display">History</h1></div>
        <div className="card empty">
          <p><b>No workouts saved yet.</b></p>
          <p className="muted small">Finish a workout and save it: it shows up here with every set, and each exercise gets a progress chart.</p>
          <a className="btn primary" href="#today">Go to Today</a>
        </div>
      </div>
    );
  }

  const st = periodStats(s.sessions);
  return (
    <div className="history">
      <div className="page-head page-head-row">
        <div>
          <h1 className="display">History</h1>
          <p className="muted small">{sessions.length} {sessions.length === 1 ? "workout" : "workouts"} saved</p>
        </div>
        <Seg label="Show" value={tab.v} options={[{ value: "workouts", label: "Workouts" }, { value: "exercises", label: "Exercises" }]} onChange={(v) => setTab({ v })} />
      </div>

      <div className="tiles">
        <Tile label="This week" n={st.week.n} ms={st.week.ms} />
        <Tile label="Last 30 days" n={st.last30.n} ms={st.last30.ms} />
        <Tile label="All time" n={st.total.n} ms={st.total.ms} />
      </div>

      {tab.v === "workouts" ? (
        <>
          <Activity s={s} />
          <SessionList s={s} sessions={sessions} />
        </>
      ) : (
        <ExerciseList s={s} />
      )}
    </div>
  );
}

function Tile({ label, n, ms }: { label: string; n: number; ms: number }) {
  return (
    <div className="tile card">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{n}</span>
      <span className="tile-sub">{n === 1 ? "workout" : "workouts"}{ms > 0 ? ` · ${formatDuration(ms)}` : ""}</span>
    </div>
  );
}

/** Last 12 weeks, one cell per day; a filled cell is a day with a saved workout. */
function Activity({ s }: { s: AppState }) {
  const weeks = 12;
  const now = new Date();
  const today = dateStr(now);
  const start = weekStartDate(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  const byDate = new Map<string, Session[]>();
  for (const x of s.sessions) byDate.set(x.date, [...(byDate.get(x.date) ?? []), x]);
  const order = displayDays();
  const cols = Array.from({ length: weeks }, (_, wk) =>
    Array.from({ length: 7 }, (_, k) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + wk * 7 + k);
      return { date: dateStr(d), d, list: byDate.get(dateStr(d)) ?? [] };
    }));
  const active = cols.flat().filter((c) => c.list.length).length;
  return (
    <section className="card activity" aria-labelledby="act-title">
      <div className="card-head">
        <h2 id="act-title">Last 12 weeks</h2>
        <span className="muted small">{active} {active === 1 ? "day" : "days"} trained</span>
      </div>
      <div className="act-grid" role="list">
        <div className="act-days" aria-hidden="true">
          {order.map((d, k) => <span key={d}>{k % 2 === 0 ? dayName(d, "short").slice(0, 1) : ""}</span>)}
        </div>
        {cols.map((col, wk) => (
          <div className="act-col" key={wk}>
            {col.map((c) => {
              const future = c.date > today;
              const names = c.list.map((x) => sessionName(s, x)).join(", ");
              const label = `${shortDate(c.date)}: ${c.list.length ? names : "no workout"}`;
              return (
                <span
                  key={c.date}
                  role="listitem"
                  className={`act-cell${c.list.length ? " on" : ""}${c.date === today ? " today" : ""}${future ? " future" : ""}`}
                  title={future ? undefined : label}
                  aria-label={future ? undefined : label}
                  aria-hidden={future ? true : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function SessionList({ s, sessions }: { s: AppState; sessions: Session[] }) {
  const months = new Map<string, Session[]>();
  for (const x of sessions) {
    const k = x.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), x]);
  }
  return (
    <div className="groups">
      {[...months.entries()].map(([k, list]) => {
        const [y, m] = k.split("-").map(Number);
        const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
        return (
          <section key={k} className="group" aria-label={title}>
            <div className="group-head"><h2>{title}</h2><span className="muted small">{list.length}</span></div>
            <ul className="card ex-list">
              {list.map((x) => {
                const [yy, mm, dd] = x.date.split("-").map(Number);
                const d = new Date(yy, mm - 1, dd);
                const sets = doneSets(x).length;
                return (
                  <li key={x.id}>
                    <a className="ex-row session-row" href={`#history/${x.id}`}>
                      <span className="date-chip" aria-hidden="true">
                        <b>{d.getDate()}</b>
                        <span>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                      </span>
                      <span className="ex-main">
                        <span className="ex-name">{sessionName(s, x)}</span>
                        <span className="ex-meta">
                          {relativeDay(x.date)}{sessionMs(x) ? ` · ${formatDuration(sessionMs(x))}` : ""} · {sets} {sets === 1 ? "set" : "sets"}{x.rpe ? ` · RPE ${x.rpe}` : ""}
                        </span>
                      </span>
                      <IconChevronRight className="ex-chev" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ExerciseList({ s }: { s: AppState }) {
  const list = loggedExercises(s.sessions, s.customExercises);
  return (
    <ul className="card ex-list">
      {list.map((e) => {
        const ex = getExercise(e.id, s.customExercises);
        return (
          <li key={e.id}>
            <a className="ex-row" href={`#history/exercise/${e.id}`}>
              <span className="ex-main">
                <span className="ex-name">{e.name}</span>
                <span className="ex-meta">{e.sessions} {e.sessions === 1 ? "workout" : "workouts"} · last done {lastDone(e.last.date)}</span>
              </span>
              {ex && <span className={`tag mode-${ex.mode}`}>{MODE_LABEL[ex.mode]}</span>}
              <IconChevronRight className="ex-chev" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ── One saved workout ─────────────────────────────────────────

function SessionDetail({ id }: { id: string }) {
  const s = useAppState();
  const x = s.sessions.find((y) => y.id === id);
  const [note, setNote] = useState<string | null>(null);
  if (!x) {
    return (
      <div className="pick">
        <p><b>This workout isn't in your history.</b> It may have been deleted.</p>
        <a className="btn sm" href="#history">Back to history</a>
      </div>
    );
  }
  const name = sessionName(s, x);
  const done = doneSets(x).length;
  const skipped = x.sets.length - done;
  const started = new Date(x.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const workout = liveWorkout(s, x.workoutId);

  return (
    <div className="history session-detail">
      <a className="back" href="#history"><IconBack /> History</a>
      <header className="builder-head">
        <div className="detail-head">
          <p className="eyebrow">{longDate(x.date)} · {started}</p>
          <h1 className="display">{name}</h1>
        </div>
        <Menu
          label="Workout options"
          items={[
            { label: "Open the workout", hidden: !workout, onSelect: () => { location.hash = `#workouts/${x.workoutId}`; } },
            { label: "Delete from history", danger: true, onSelect: () => {
              const snap = structuredClone(x);
              location.hash = "#history";
              deleteSession(x.id);
              showToast(`Deleted ${name}, ${shortDate(x.date)}`, { label: "Undo", run: () => restoreSession(snap) });
            } },
          ]}
        />
      </header>

      <div className="stats card">
        <div><b>{sessionMs(x) ? formatDuration(sessionMs(x)) : "–"}</b><span>time</span></div>
        <div><b>{done}</b><span>{done === 1 ? "set" : "sets"}</span></div>
        <div><b>{skipped}</b><span>skipped</span></div>
      </div>

      {x.sets.length > 0 && (
        <ul className="card summary-list">
          {groupSets(x.sets, s.customExercises).map((g) => (
            <li key={g.name}>
              <a className="var-name" href={`#history/exercise/${g.sets[0].exerciseId}`}>{g.name}</a>
              <span className="muted small">{setsLine(g.mode, g.sets)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <span className="stepper-label">How hard was it? (RPE)</span>
        <div className="rpe" role="group" aria-label="Effort, 1 to 10">
          {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
            <button type="button" key={n} className="chip" aria-pressed={x.rpe === n} onClick={() => updateSession(x.id, { rpe: x.rpe === n ? undefined : n })}>{n}</button>
          ))}
        </div>
        <label className="note">
          <span className="stepper-label">Note</span>
          <textarea
            rows={3}
            value={note ?? x.note ?? ""}
            placeholder="How it felt, what to change next time"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if (note !== null) { updateSession(x.id, { note: note.trim() || undefined }); setNote(null); } }}
          />
        </label>
      </div>
    </div>
  );
}

// ── One exercise over time ────────────────────────────────────

type Metric = "best" | "total" | "kg";

function ExerciseProgress({ id }: { id: string }) {
  const s = useAppState();
  const ex = getExercise(id, s.customExercises);
  const tracks = tracksFor(id, s.sessions, s.customExercises);
  const [pick, setPick] = useSessionState<{ track: string; metric: Metric }>(`workoutPath.progress.${id}`, { track: "", metric: "best" });

  if (!ex || !tracks.length) {
    return (
      <div className="history">
        <a className="back" href="#history"><IconBack /> History</a>
        <div className="pick">
          <p><b>{ex ? `No ${ex.name.toLowerCase()} logged yet.` : "That exercise isn't in the catalog."}</b></p>
          {ex && <a className="btn sm" href={`#catalog/${ex.id}`}>See it in the catalog</a>}
        </div>
      </div>
    );
  }

  const track: Track = tracks.find((t) => t.key === pick.track) ?? tracks[0];
  const pts = seriesFor(id, track, s.sessions);
  const hasKg = pts.some((p) => p.kg > 0);
  const metric: Metric = pick.metric === "kg" && !hasKg ? "best" : pick.metric;
  const val = (p: Point) => (metric === "best" ? p.best : metric === "total" ? p.total : p.kg);
  const fmt = (v: number) => (metric === "kg" ? `${v} kg` : formatValue(v, track.mode));
  const tick = (v: number) => (metric === "kg" ? `${v}` : track.mode === "hold" ? (v >= 60 ? `${Math.round((v / 60) * 10) / 10}m` : `${v}s`) : `${v}`);
  const bestPt = pts.reduce((a, p) => (p.best > a.best ? p : a), pts[0]);
  const last = pts[pts.length - 1];
  const heaviest = pts.reduce((a, p) => Math.max(a, p.kg), 0);
  const metricLabel = metric === "best" ? "Best set" : metric === "total" ? (track.mode === "reps" ? "Total reps" : "Total time") : "Weight";

  return (
    <div className="history progress">
      <a className="back" href="#history"><IconBack /> History</a>
      <header className="detail-head">
        <p className="eyebrow">{sectionById(ex.section).name}</p>
        <h1 className="display">{ex.name}</h1>
      </header>

      {tracks.length > 1 && (
        <div className="chips" role="group" aria-label="Variation">
          {tracks.map((t) => (
            <button type="button" key={t.key} className="chip" aria-pressed={t.key === track.key} onClick={() => setPick((p) => ({ ...p, track: t.key }))}>
              {t.label}{t.key !== "all" && tracks.some((u) => u.mode !== t.mode) ? ` · ${MODE_LABEL[t.mode].toLowerCase()}` : ""}
            </button>
          ))}
        </div>
      )}

      <div className="tiles">
        <div className="tile card">
          <span className="tile-label">Best set</span>
          <span className="tile-value">{formatValue(bestPt.best, track.mode)}</span>
          <span className="tile-sub">{shortDate(bestPt.date)}</span>
        </div>
        <div className="tile card">
          <span className="tile-label">Last time</span>
          <span className="tile-value">{formatValue(last.best, track.mode)}</span>
          <span className="tile-sub">{relativeDay(last.date)}</span>
        </div>
        <div className="tile card">
          <span className="tile-label">{heaviest ? "Heaviest" : "Workouts"}</span>
          <span className="tile-value">{heaviest ? `${heaviest} kg` : pts.length}</span>
          <span className="tile-sub">{heaviest ? `${pts.length} ${pts.length === 1 ? "workout" : "workouts"}` : "with this exercise"}</span>
        </div>
      </div>

      <section className="card" aria-labelledby="chart-title">
        <div className="card-head">
          <h2 id="chart-title">{metricLabel} per workout</h2>
          <Seg
            label="Measure"
            value={metric}
            options={[
              { value: "best", label: "Best" },
              { value: "total", label: "Total" },
              ...(hasKg ? [{ value: "kg" as const, label: "Weight" }] : []),
            ]}
            onChange={(m) => setPick((p) => ({ ...p, metric: m }))}
          />
        </div>
        <LineChart
          title={`${ex.name}, ${metricLabel.toLowerCase()} per workout`}
          points={pts.map((p) => ({ t: p.t, v: val(p), label: shortDate(p.date) }))}
          format={fmt}
          tick={tick}
        />
        {pts.length === 1 && <p className="muted small">One workout so far. Log it again to see the trend.</p>}
      </section>

      <section className="group" aria-labelledby="sess-title">
        <div className="group-head"><h2 id="sess-title">Workouts</h2><span className="muted small">{pts.length}</span></div>
        <ul className="card ex-list">
          {[...pts].reverse().map((p) => (
            <li key={p.id}>
              <a className="ex-row" href={`#history/${p.id}`}>
                <span className="ex-main">
                  <span className="ex-name">{relativeDay(p.date)}</span>
                  <span className="ex-meta">{setsLine(track.mode, p.sets)}</span>
                </span>
                <span className="muted small">{fmt(val(p))}</span>
                <IconChevronRight className="ex-chev" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <a className="link-row" href={`#catalog/${ex.id}`}>Cue, variations and defaults in the catalog <IconChevronRight /></a>
    </div>
  );
}
