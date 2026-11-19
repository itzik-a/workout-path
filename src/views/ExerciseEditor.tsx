/* Create / edit a custom exercise: #catalog/new, #catalog/<u-id>/edit. Saved on "Save" (a draft until then). */
import { useState } from "react";
import {
  EQUIPMENT_LABEL, MODE_LABEL, REGION_LABEL, SECTIONS,
  type Dose, type Equipment, type Exercise, type Mode, type Region, type SectionId, type Variation,
} from "../data/catalog";
import { IconBack, IconClose, IconPlus } from "../components/Icons";
import { ChipGroup, Seg, Select, Stepper } from "../components/ui";
import { uid } from "../lib/workout";
import { saveCustomExercise } from "../state/actions";

const MODES = (Object.keys(MODE_LABEL) as Mode[]).map((value) => ({ value, label: MODE_LABEL[value] }));
const REGIONS = (Object.keys(REGION_LABEL) as Region[]).map((value) => ({ value, label: REGION_LABEL[value] }));
const EQUIPMENT = (Object.keys(EQUIPMENT_LABEL) as Equipment[]).map((value) => ({ value, label: EQUIPMENT_LABEL[value] }));

/** Default amount when the mode changes. */
const amountFor = (mode: Mode, sets: number, kg?: number): Dose =>
  mode === "reps" ? { sets, reps: 10, kg } : mode === "hold" ? { sets, seconds: 30, kg } : { sets, minutes: 5, kg };

const amountOf = (d: Dose, mode: Mode) => (mode === "reps" ? d.reps ?? 10 : mode === "hold" ? d.seconds ?? 30 : d.minutes ?? 5);
const withAmount = (d: Dose, mode: Mode, n: number): Dose =>
  ({ sets: d.sets, kg: d.kg, ...(mode === "reps" ? { reps: n } : mode === "hold" ? { seconds: n } : { minutes: n }) });

const blank = (): Exercise => ({ id: "", name: "", section: "core", regions: ["core"], mode: "reps", dose: { sets: 3, reps: 10 } });

export function ExerciseEditor({ initial }: { initial?: Exercise }) {
  const [ex, setEx] = useState<Exercise>(() => structuredClone(initial ?? blank()));
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Exercise>) => setEx((e) => ({ ...e, ...patch }));
  const vars = ex.variations ?? [];
  const setVar = (i: number, patch: Partial<Variation>) => set({ variations: vars.map((v, k) => (k === i ? { ...v, ...patch } : v)) });
  const nameOk = ex.name.trim().length > 0;
  const back = initial ? `#catalog/${initial.id}` : "#catalog";

  const save = () => {
    setTried(true);
    if (!nameOk || !ex.regions.length) return;
    const clean: Exercise = {
      ...ex,
      name: ex.name.trim(),
      cue: ex.cue?.trim() || undefined,
      equipment: ex.equipment?.length ? ex.equipment : undefined,
      perSide: ex.perSide || undefined,
      variations: vars.filter((v) => v.name.trim()).map((v) => ({ ...v, name: v.name.trim() })),
    };
    if (!clean.variations?.length) delete clean.variations;
    location.hash = `#catalog/${saveCustomExercise(clean)}`;
  };

  return (
    <article className="detail editor" aria-labelledby="ed-title">
      <a className="back" href={back}><IconBack /> {initial ? initial.name : "Catalog"}</a>
      <header className="detail-head">
        <p className="eyebrow">Custom exercise</p>
        <h1 id="ed-title" className="display">{initial ? "Edit exercise" : "New exercise"}</h1>
      </header>

      <div className="card form">
        <label className="field">
          <span className="stepper-label">Name</span>
          <input
            className="text-input" value={ex.name} placeholder="e.g. Archer push up" autoComplete="off"
            aria-invalid={tried && !nameOk} onChange={(e) => set({ name: e.target.value })}
          />
          {tried && !nameOk && <span className="form-error">Give it a name.</span>}
        </label>
        <Select<SectionId>
          label="Section"
          value={ex.section}
          options={SECTIONS.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(section) => set({ section })}
        />
        <ChipGroup label="Body" options={REGIONS} value={ex.regions} onChange={(regions) => set({ regions })} />
        {tried && !ex.regions.length && <span className="form-error">Pick at least one.</span>}
        <div className="field">
          <span className="stepper-label">Type</span>
          <Seg label="Type" value={ex.mode} options={MODES} onChange={(mode) => set({ mode, dose: amountFor(mode, ex.dose.sets, ex.dose.kg) })} />
        </div>
        <div className="dose-row">
          <Stepper label="Sets" value={ex.dose.sets} min={1} max={20} onChange={(sets) => set({ dose: { ...ex.dose, sets } })} />
          {ex.mode === "reps" && <Stepper label="Reps" value={amountOf(ex.dose, "reps")} min={1} max={300} onChange={(n) => set({ dose: withAmount(ex.dose, "reps", n) })} />}
          {ex.mode === "hold" && <Stepper label="Hold" value={amountOf(ex.dose, "hold")} min={1} max={900} step={5} unit="s" onChange={(n) => set({ dose: withAmount(ex.dose, "hold", n) })} />}
          {ex.mode === "time" && <Stepper label="Time" value={amountOf(ex.dose, "time")} min={1} max={240} unit="min" onChange={(n) => set({ dose: withAmount(ex.dose, "time", n) })} />}
          <Stepper label="Weight" value={ex.dose.kg ?? 0} min={0} max={300} unit="kg" decimal onChange={(kg) => set({ dose: { ...ex.dose, kg: kg || undefined } })} />
        </div>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={!!ex.perSide} onClick={() => set({ perSide: !ex.perSide })}>Per side</button>
        </div>
        <ChipGroup label="Equipment" options={EQUIPMENT} value={ex.equipment ?? []} onChange={(equipment) => set({ equipment })} />
        <label className="field">
          <span className="stepper-label">Form cue</span>
          <textarea className="text-input" rows={2} value={ex.cue ?? ""} placeholder="One line you want to remember while doing it" onChange={(e) => set({ cue: e.target.value })} />
        </label>
      </div>

      <section className="card form" aria-labelledby="ed-var">
        <h2 id="ed-var">Variations</h2>
        <p className="muted small">Optional, e.g. easier and harder versions. Each can be counted differently from the exercise.</p>
        {vars.map((v, i) => {
          const mode = v.mode ?? ex.mode;
          return (
            <div className="var-edit" key={v.id}>
              <div className="var-edit-top">
                <input className="text-input" value={v.name} placeholder={`Variation ${i + 1}`} aria-label={`Variation ${i + 1} name`} onChange={(e) => setVar(i, { name: e.target.value })} />
                <button type="button" className="icon-btn subtle" aria-label={`Remove variation ${v.name || i + 1}`} onClick={() => set({ variations: vars.filter((_, k) => k !== i) })}><IconClose /></button>
              </div>
              <div className="dose-row">
                <Select<"same" | Mode>
                  label="Counted as"
                  value={v.mode ?? "same"}
                  options={[{ value: "same", label: `Same as exercise (${MODE_LABEL[ex.mode].toLowerCase()})` }, ...MODES.filter((m) => m.value !== ex.mode)]}
                  onChange={(m) => setVar(i, m === "same" ? { mode: undefined, dose: undefined } : { mode: m, dose: amountFor(m, ex.dose.sets) })}
                />
                {v.mode && v.dose && (
                  <Stepper
                    label={v.mode === "reps" ? "Reps" : v.mode === "hold" ? "Hold" : "Time"}
                    value={amountOf(v.dose, mode)} min={1} max={900} step={v.mode === "hold" ? 5 : 1} unit={v.mode === "hold" ? "s" : v.mode === "time" ? "min" : undefined}
                    onChange={(n) => setVar(i, { dose: withAmount(v.dose!, mode, n) })}
                  />
                )}
              </div>
            </div>
          );
        })}
        <button type="button" className="btn ghost sm" onClick={() => set({ variations: [...vars, { id: `v-${uid()}`, name: "" }] })}>
          <IconPlus /> Add variation
        </button>
      </section>

      <div className="row-btns">
        <button type="button" className="btn primary" onClick={save}>{initial ? "Save changes" : "Create exercise"}</button>
        <a className="btn ghost" href={back}>Cancel</a>
      </div>
    </article>
  );
}
