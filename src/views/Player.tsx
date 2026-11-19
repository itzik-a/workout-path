/* Full-screen workout player. The run lives in src/state/run.ts; the engine is src/lib/player.ts. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isTimedWork, modeLabel, type Exercise } from "../data/catalog";
import { IconClose, IconExternal, IconMinus, IconMute, IconPlus, IconPrev, IconSkip, IconSound } from "../components/Icons";
import { Ring } from "../components/ui";
import { sound, unlockAudio } from "../lib/audio";
import { formatSeconds } from "../lib/format";
import {
  addRest, back, buildSteps, catchUp, clock, current, finishSet, loggedSets, newRun, pause, phaseOf,
  remaining, resume, skip, startSet, type Run, type WorkStep,
} from "../lib/player";
import { showToast } from "../lib/toast";
import { keepAwake } from "../lib/wakeLock";
import { GROUP_LABEL, getExercise, itemTitle, uid, workoutSummary } from "../lib/workout";
import { addSession, applySuggestion, dismissSuggestion, setBeeps } from "../state/actions";
import { activeSuggestion } from "../lib/progress";
import { getRun, mutateRun, setRun, useRun } from "../state/run";
import { getState, todayStr, useAppState, type Session, type SetLog, type Workout } from "../state/store";

/** Start (or resume) a workout. Call from a tap: it unlocks sound and keeps the screen on. */
export function startWorkout(w: Workout) {
  unlockAudio();
  const r = getRun();
  if (r && r.workoutId !== w.id) {
    if (!window.confirm(`${r.workoutName || "A workout"} is in progress. Discard it and start ${w.name || "this one"}?`)) return;
    setRun(null);
  }
  if (!getRun()) setRun(newRun(w, buildSteps(w, getState().customExercises), Date.now()));
  void keepAwake(true);
  location.hash = `#play/${w.id}`;
}

export function Player({ workoutId }: { workoutId?: string }) {
  const s = useAppState();
  const run = useRun();
  const w = s.workouts.find((x) => x.id === workoutId && !x.deletedAt);
  const active = run && run.workoutId === workoutId ? run : null;

  useEffect(() => {
    document.documentElement.classList.add("playing");
    return () => { document.documentElement.classList.remove("playing"); void keepAwake(false); };
  }, []);

  if (active) return active.done ? <Summary run={active} custom={s.customExercises} /> : <Live run={active} custom={s.customExercises} beeps={s.settings.beeps} />;

  if (run) {
    return (
      <div className="player player-msg">
        <div className="card">
          <p><b>{run.workoutName || "Another workout"} is in progress.</b></p>
          <div className="row-btns">
            <a className="btn primary" href={`#play/${run.workoutId}`}>Resume it</a>
            {w && <button type="button" className="btn ghost" onClick={() => { setRun(null); startWorkout(w); }}>Discard it, start {w.name || "this one"}</button>}
          </div>
        </div>
      </div>
    );
  }

  if (!w) {
    return (
      <div className="player player-msg">
        <div className="card">
          <p><b>This workout isn't here.</b></p>
          <a className="btn sm" href="#workouts">Back to workouts</a>
        </div>
      </div>
    );
  }

  return (
    <div className="player player-msg">
      <div className="card start-card">
        <p className="eyebrow">Ready</p>
        <h1 className="display">{w.name || "Untitled workout"}</h1>
        <p className="muted small">{workoutSummary(w, s.customExercises)}</p>
        <div className="row-btns">
          <button type="button" className="btn primary" disabled={!w.blocks.length} onClick={() => startWorkout(w)}>Start workout</button>
          <a className="btn ghost" href={`#workouts/${w.id}`}>Edit</a>
        </div>
      </div>
    </div>
  );
}

// ── Live ────────────────────────────────────────────────────────

function stepTitle(st: WorkStep, custom: Exercise[]) {
  const ex = getExercise(st.exerciseId, custom);
  const v = ex?.variations?.find((x) => x.id === st.variationId);
  return { ...itemTitle(ex, v), ex };
}

function stepContext(st: WorkStep) {
  const parts = [st.group ? `Round ${st.set} of ${st.sets}` : `Set ${st.set} of ${st.sets}`];
  if (st.group) parts.push(`${GROUP_LABEL[st.group.kind]} ${st.group.i}/${st.group.n}`);
  if (st.side) parts.push(st.side === "left" ? "Left side" : "Right side");
  return parts.join(" · ");
}

function stepDose(st: WorkStep) {
  const amount = st.mode === "reps" ? `${st.reps ?? 0} reps` : st.mode === "hold" ? formatSeconds(st.seconds ?? 0) : `${st.minutes ?? 0} min`;
  return st.kg ? `${amount} · ${st.kg} kg` : amount;
}

function Live({ run, custom, beeps }: { run: Run; custom: Exercise[]; beeps: boolean }) {
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const prev = useRef<{ i: number; cd: number | null; lead: boolean }>({ i: -1, cd: null, lead: false });

  // Tick: apply timers that ended, beep the countdowns, refresh the clock.
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      const cur = getRun();
      if (!cur || cur.done) return;
      const r = structuredClone(cur);
      const res = catchUp(r, t);
      if (res.count) setRun(r);
      const on = getState().settings.beeps;
      if (on && res.count === 1) (res.last === "rest" ? sound.go : sound.done)();
      let cd: number | null = null, lead = false;
      const tm = r.done ? null : r.timer;
      if (tm && tm.left == null) {
        const p = phaseOf(tm, t);
        if (p.lead) { cd = p.sec; lead = true; } else if (current(r)?.kind === "rest") cd = Math.ceil(p.ms / 1000);
      }
      const pv = prev.current;
      if (on && pv.i === r.i && cd !== null && cd !== pv.cd && cd >= 1 && cd <= 3) sound.tick();
      if (on && pv.i === r.i && pv.lead && !lead && tm && res.count === 0) sound.go();
      prev.current = { i: r.i, cd, lead };
      setNow(t);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  const st = current(run)!;
  const t = run.timer;
  const paused = t?.left != null;
  const act = (fn: (r: Run, now: number) => void) => () => { unlockAudio(); void keepAwake(true); mutateRun((r) => fn(r, Date.now())); };

  const primary =
    st.kind === "rest" ? { label: "Skip rest", run: act(skip) }
    : st.mode === "reps" ? { label: "Done", run: act(finishSet) }
    : !t ? { label: "Start", run: act(startSet) }
    : paused ? { label: "Resume", run: act(resume) }
    : { label: "Pause", run: act(pause) };

  // Mac keyboard: Space = main button, → skip, ← back.
  const keys = useRef({ primary, skip: act(skip), back: act(back) });
  keys.current = { primary, skip: act(skip), back: act(back) };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") { e.preventDefault(); keys.current.primary.run(); }
      else if (e.key === "ArrowRight") keys.current.skip();
      else if (e.key === "ArrowLeft") keys.current.back();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const works = run.steps.filter((x) => x.kind === "work").length;
  const doneWorks = run.steps.slice(0, run.i).filter((x) => x.kind === "work").length;
  const nextWork = run.steps.slice(run.i + 1).find((x): x is WorkStep => x.kind === "work");

  return (
    <div className="player" onPointerDownCapture={() => { unlockAudio(); void keepAwake(true); }}>
      <header className="player-top">
        <button type="button" className="icon-btn subtle" aria-label="End workout" onClick={() => { mutateRun((r) => pause(r, Date.now())); setEnding(true); }}>
          <IconClose width={20} height={20} />
        </button>
        <div className="player-top-mid">
          <span className="player-name">{run.workoutName || "Workout"}</span>
          <span className="player-elapsed">{clock(now - run.startedAt, false)}</span>
        </div>
        <button type="button" className="icon-btn subtle" aria-label={beeps ? "Turn sound off" : "Turn sound on"} aria-pressed={beeps} onClick={() => setBeeps(!beeps)}>
          {beeps ? <IconSound /> : <IconMute />}
        </button>
      </header>
      <div className="player-progress" role="progressbar" aria-valuemin={0} aria-valuemax={works} aria-valuenow={doneWorks} aria-label="Sets done">
        <span style={{ width: `${(doneWorks / Math.max(1, works)) * 100}%` }} />
      </div>

      <main className="player-main">
        {st.kind === "rest" ? (
          <RestView run={run} now={now} next={nextWork} custom={custom} />
        ) : (
          <WorkView run={run} st={st} now={now} custom={custom} />
        )}
      </main>

      <div className="player-controls">
        <button type="button" className="btn primary player-primary" onClick={primary.run}>{primary.label}</button>
        <div className="player-secondary">
          <button type="button" className="btn ghost" onClick={act(back)} aria-label="Back to the previous set"><IconPrev width={18} height={18} /> Back</button>
          {st.kind === "rest" ? (
            <button type="button" className="btn ghost" onClick={act((r) => addRest(r, 15000))}>+15 s</button>
          ) : st.mode !== "reps" && t ? (
            <button type="button" className="btn ghost" onClick={act(finishSet)}>End set</button>
          ) : <span />}
          <button type="button" className="btn ghost" onClick={act(skip)} aria-label="Skip to the next step">Skip <IconSkip width={18} height={18} /></button>
        </div>
        {st.kind === "work" && nextWork && (
          <p className="player-next"><span className="eyebrow">Next</span> {stepTitle(nextWork, custom).main} · {stepDose(nextWork)}</p>
        )}
      </div>

      {ending && <EndSheet run={run} onClose={() => setEnding(false)} />}
    </div>
  );
}

function WorkView({ run, st, now, custom }: { run: Run; st: WorkStep; now: number; custom: Exercise[] }) {
  const { main, sub, ex } = stepTitle(st, custom);
  const t = run.timer;
  let big: ReactNode, ring = 1, note = "";
  if (st.mode === "reps") {
    const n = run.reps ?? st.reps ?? 0;
    const set = (d: number) => mutateRun((r) => { r.reps = Math.max(0, (r.reps ?? st.reps ?? 0) + d); });
    big = (
      <div className="reps">
        <button type="button" className="reps-btn" aria-label="One rep less" onClick={() => set(-1)}><IconMinus width={26} height={26} /></button>
        <span className="big-num" aria-live="polite">{n}</span>
        <button type="button" className="reps-btn" aria-label="One rep more" onClick={() => set(1)}><IconPlus width={26} height={26} /></button>
      </div>
    );
    note = n === st.reps ? "reps" : `reps · target ${st.reps}`;
  } else if (!t) {
    big = <span className="big-clock">{clock((st.mode === "hold" ? st.seconds ?? 0 : (st.minutes ?? 0) * 60) * 1000)}</span>;
    note = `${st.override ? "Timed" : modeLabel(st.mode, ex)} · tap Start`;
  } else {
    const p = phaseOf(t, now);
    if (p.lead) { big = <span className="big-num">{p.sec}</span>; note = "Get ready"; }
    else { big = <span className="big-clock">{clock(p.ms)}</span>; ring = p.frac; note = t.left != null ? "Paused" : st.mode === "hold" && !st.override && !isTimedWork(st.mode, ex) ? "Hold" : "Go"; }
  }
  return (
    <>
      <div className="player-head">
        <p className="eyebrow">{stepContext(st)}</p>
        <h1 className="player-title">{main}</h1>
        {sub && <p className="player-sub">{sub}</p>}
      </div>
      <Ring value={ring} className={`player-ring${t?.left != null ? " paused" : ""}${st.mode === "reps" ? " static" : ""}`}>
        {big}
        <span className="ring-note">{note}</span>
      </Ring>
      <p className="player-cue">{st.kg ? <b>{st.kg} kg · </b> : null}{ex?.cue}</p>
      <PlayerLinks id={st.exerciseId} builtIn={ex?.links} />
    </>
  );
}

/** The exercise's how-to videos, then my links on it (e.g. a form video), small, under the cue. */
function PlayerLinks({ id, builtIn }: { id: string; builtIn?: { url: string; label?: string }[] }) {
  const mine = useAppState().exerciseNotes[id]?.links;
  const links = [...(builtIn ?? []), ...(mine ?? [])];
  if (!links.length) return null;
  return (
    <p className="player-links">
      {links.slice(0, 3).map((l, i) => (
        <a key={i} className="tag" href={l.url} target="_blank" rel="noopener noreferrer">{l.label || "Video"} <IconExternal width={12} height={12} /></a>
      ))}
    </p>
  );
}

function RestView({ run, now, next, custom }: { run: Run; now: number; next?: WorkStep; custom: Exercise[] }) {
  const t = run.timer!;
  const ms = remaining(t, now);
  const label = (current(run) as { label: string }).label;
  const title = next ? stepTitle(next, custom) : null;
  return (
    <>
      <div className="player-head">
        <p className="eyebrow">{t.left != null ? "Paused" : "Rest"}</p>
        <h1 className="player-title">{label}</h1>
      </div>
      <Ring value={t.dur ? ms / t.dur : 0} className={`player-ring rest${t.left != null ? " paused" : ""}`}>
        <span className="big-clock">{clock(ms)}</span>
        <span className="ring-note">of {clock(t.dur)}</span>
      </Ring>
      {next && title && (
        <div className="up-next card">
          <span className="eyebrow">Up next</span>
          <span className="up-next-name">{title.main}{title.sub && <span className="muted"> · {title.sub}</span>}</span>
          <span className="muted small">{stepContext(next)} · {stepDose(next)}</span>
        </div>
      )}
    </>
  );
}

function EndSheet({ run, onClose }: { run: Run; onClose: () => void }) {
  const done = loggedSets(run).filter((x) => !x.skipped).length;
  const works = run.steps.filter((x) => x.kind === "work").length;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet card" role="dialog" aria-modal="true" aria-labelledby="end-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="end-title">End workout?</h2>
        <p className="muted small">You've done {done} of {works} sets. The timer is paused.</p>
        <button type="button" className="btn primary" onClick={() => mutateRun((r) => { r.done = true; r.endedAt = Date.now(); })}>Finish and review</button>
        <button type="button" className="btn ghost" onClick={onClose}>Keep going</button>
        <button type="button" className="btn ghost danger" onClick={() => {
          const id = run.workoutId;
          setRun(null);
          location.hash = `#workouts/${id}`;
          showToast("Workout discarded");
        }}>Discard workout</button>
      </div>
    </div>
  );
}

// ── Summary ─────────────────────────────────────────────────────

/** Logged sets grouped by exercise + variation, in the order first done. */
export function groupSets(sets: SetLog[], custom: Exercise[]) {
  const groups = new Map<string, { name: string; mode: string; sets: SetLog[] }>();
  for (const x of sets) {
    const key = `${x.exerciseId}:${x.variationId ?? ""}:${x.mode ?? ""}`;
    if (!groups.has(key)) {
      const ex = getExercise(x.exerciseId, custom);
      const v = ex?.variations?.find((y) => y.id === x.variationId);
      const t = itemTitle(ex, v);
      const name = t.sub ? `${t.main} · ${t.sub}` : t.main;
      groups.set(key, { name: x.mode ? `${name} (timed)` : name, mode: x.mode ?? v?.mode ?? ex?.mode ?? "reps", sets: [] });
    }
    groups.get(key)!.sets.push(x);
  }
  return [...groups.values()];
}

/** "12, 12, 10 reps · 12 kg", "45 s, 30 s", "20 min, skipped". */
export function setsLine(mode: string, sets: SetLog[]) {
  const vals = sets.map((x) =>
    x.skipped ? "skipped"
    : mode === "reps" ? `${x.reps ?? 0}`
    : mode === "hold" ? formatSeconds(x.seconds ?? 0)
    : `${x.minutes ?? 0} min`);
  if (mode === "reps") {
    const i = vals.map((v) => v !== "skipped").lastIndexOf(true);
    if (i >= 0) vals[i] += " reps";
  }
  const kg = [...new Set(sets.filter((x) => x.kg && !x.skipped).map((x) => x.kg))];
  return `${vals.join(", ")}${kg.length ? ` · ${kg.join("/")} kg` : ""}`;
}

/** After a workout: what's ready to go up next time (this workout's results included). */
function NextTime({ run, sets, custom }: { run: Run; sets: SetLog[]; custom: Exercise[] }) {
  const s = useAppState();
  const w = s.workouts.find((x) => x.id === run.workoutId && !x.deletedAt);
  if (!w) return null;
  const now: Session = { id: "pending", workoutId: w.id, date: todayStr(), startedAt: run.startedAt, endedAt: run.endedAt ?? Date.now(), sets };
  const sessions = [...s.sessions, now];
  const list = w.blocks.flatMap((b) => b.items).flatMap((it) => {
    const sg = activeSuggestion(it, sessions, custom);
    if (!sg) return [];
    const ex = getExercise(it.exerciseId, custom);
    const v = ex?.variations?.find((x) => x.id === it.variationId);
    const t = itemTitle(ex, v);
    return [{ it, sg, name: t.sub ? `${t.main} · ${t.sub}` : t.main }];
  });
  if (!list.length) return null;
  return (
    <section className="card" aria-labelledby="next-title">
      <h2 id="next-title">Next time</h2>
      <p className="muted small">You hit these in your last two workouts. Update {w.name || "the workout"}?</p>
      <ul className="next-list">
        {list.map(({ it, sg, name }) => (
          <li key={it.id}>
            <span><b>{name}</b><span className="muted small"> · {sg.text}</span></span>
            <span className="row-btns">
              <button type="button" className="btn sm primary" onClick={() => { applySuggestion(w.id, it.id, sg); showToast(`${name} updated`); }}>{sg.kind === "move-up" ? "Move up" : "Apply"}</button>
              <button type="button" className="btn sm ghost" onClick={() => dismissSuggestion(w.id, it.id, sg.key)}>Not now</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Summary({ run, custom }: { run: Run; custom: Exercise[] }) {
  const [rpe, setRpe] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const sets = loggedSets(run);
  const done = sets.filter((x) => !x.skipped).length;
  const skipped = sets.filter((x) => x.skipped).length;
  const finished = run.i >= run.steps.length;
  const endedAt = run.endedAt ?? Date.now();

  const save = () => {
    addSession({
      id: uid(),
      workoutId: run.workoutId,
      workoutName: run.workoutName,
      date: new Date(run.startedAt).toLocaleDateString("en-CA") || todayStr(),
      startedAt: run.startedAt,
      endedAt,
      sets,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(rpe ? { rpe } : {}),
    });
    const id = run.workoutId;
    setRun(null);
    location.hash = getState().workouts.some((x) => x.id === id && !x.deletedAt) ? `#workouts/${id}` : "#workouts";
    showToast(`Saved ${run.workoutName || "workout"}`);
  };

  return (
    <div className="player player-summary">
      <div className="summary">
        <div className="page-head">
          <p className="eyebrow">{finished ? "Workout done" : "Ended early"}</p>
          <h1 className="display">{run.workoutName || "Workout"}</h1>
        </div>
        <div className="stats card">
          <div><b>{clock(endedAt - run.startedAt, false)}</b><span>time</span></div>
          <div><b>{done}</b><span>{done === 1 ? "set" : "sets"}</span></div>
          <div><b>{skipped}</b><span>skipped</span></div>
        </div>
        {sets.length > 0 && (
          <ul className="card summary-list">
            {groupSets(sets, custom).map((g) => (
              <li key={g.name}><span className="var-name">{g.name}</span><span className="muted small">{setsLine(g.mode, g.sets)}</span></li>
            ))}
          </ul>
        )}
        <NextTime run={run} sets={sets} custom={custom} />
        <div className="card">
          <span className="stepper-label">How hard was it? (RPE)</span>
          <div className="rpe" role="group" aria-label="Effort, 1 to 10">
            {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
              <button type="button" key={n} className="chip" aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? undefined : n)}>{n}</button>
            ))}
          </div>
          <label className="note">
            <span className="stepper-label">Note</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How it felt, what to change next time" />
          </label>
        </div>
        <div className="row-btns">
          <button type="button" className="btn primary" onClick={save}>Save workout</button>
          {!finished && <button type="button" className="btn ghost" onClick={() => mutateRun((r) => { r.done = false; delete r.endedAt; })}>Keep going</button>}
          <button type="button" className="btn ghost danger" onClick={() => {
            if (!window.confirm("Discard this workout without saving?")) return;
            const id = run.workoutId;
            setRun(null);
            location.hash = `#workouts/${id}`;
          }}>Discard</button>
        </div>
      </div>
    </div>
  );
}
