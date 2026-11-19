/* Search + filters + list grouped by section. Used by the Catalog and the workout builder's picker. */
import { useState, type ReactNode, type RefObject } from "react";
import {
  EQUIPMENT_LABEL, EXERCISES, MODE_LABEL, REGION_LABEL, SECTIONS,
  type Equipment, type Exercise, type Mode, type Region, type SectionId,
} from "../data/catalog";
import { ChipGroup, useSessionState } from "./ui";
import { IconClose, IconFilter, IconSearch } from "./Icons";
import { NO_FILTERS, activeCount, matches, type Filters } from "../lib/filter";
import { formatDose, plural } from "../lib/format";

const REGIONS = (Object.keys(REGION_LABEL) as Region[]).map((value) => ({ value, label: REGION_LABEL[value] }));
const MODES = (Object.keys(MODE_LABEL) as Mode[]).map((value) => ({ value, label: MODE_LABEL[value] }));
const SECTION_OPTS = SECTIONS.map((s) => ({ value: s.id as SectionId, label: s.name }));
/** Only equipment some exercise actually uses, in label order, plus "none". */
const EQUIPMENT_OPTS: { value: Equipment | "none"; label: string }[] = [
  { value: "none", label: "No equipment" },
  ...(Object.keys(EQUIPMENT_LABEL) as Equipment[])
    .filter((q) => EXERCISES.some((e) => e.equipment?.includes(q)))
    .map((value) => ({ value, label: EQUIPMENT_LABEL[value] })),
];

/** Filters kept per browser session under `key`, and the exercises they let through. */
export function useFilteredExercises(key: string, exercises: Exercise[]) {
  const [f, setF] = useSessionState<Filters>(key, NO_FILTERS);
  const list = exercises.filter((e) => matches(e, f));
  return { f, setF, list };
}

export function rowMeta(ex: Exercise): string {
  const meta = [formatDose(ex.dose, ex.mode, ex.perSide)];
  if (ex.variations?.length) meta.push(plural(ex.variations.length, "variation"));
  return meta.join(" · ");
}

export function countLabel(shown: number, total: number) {
  return shown === total ? plural(total, "exercise") : `${shown} of ${total} exercises`;
}

export function FilterBar({ f, setF, searchRef }: {
  f: Filters;
  setF: (fn: (prev: Filters) => Filters) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
}) {
  const [show, setShow] = useState(() => activeCount(f) > 0);
  const n = activeCount(f);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  return (
    <>
      <div className="search-row">
        <label className="search">
          <IconSearch />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search exercises"
            aria-label="Search exercises"
            value={f.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {f.q && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { set({ q: "" }); searchRef?.current?.focus(); }}>
              <IconClose />
            </button>
          )}
        </label>
        <button type="button" className={`btn filter-btn${n ? " on" : ""}`} aria-expanded={show} onClick={() => setShow((v) => !v)}>
          <IconFilter />
          <span>Filters{n ? ` · ${n}` : ""}</span>
        </button>
      </div>

      {show && (
        <div className="filters">
          <ChipGroup label="Body" options={REGIONS} value={f.regions} onChange={(regions) => set({ regions })} />
          <ChipGroup label="Type" options={MODES} value={f.modes} onChange={(modes) => set({ modes })} />
          <ChipGroup label="Equipment" options={EQUIPMENT_OPTS} value={f.equipment} onChange={(equipment) => set({ equipment })} />
          <ChipGroup label="Section" options={SECTION_OPTS} value={f.sections} onChange={(sections) => set({ sections })} />
          {n > 0 && (
            <button type="button" className="btn ghost sm" onClick={() => setF((prev) => ({ ...NO_FILTERS, q: prev.q }))}>Clear filters</button>
          )}
        </div>
      )}
    </>
  );
}

export function GroupedList({ list, renderRow, onReset }: {
  list: Exercise[];
  renderRow: (ex: Exercise) => ReactNode;
  onReset: () => void;
}) {
  const groups = SECTIONS.map((s) => ({ s, items: list.filter((e) => e.section === s.id) })).filter((g) => g.items.length);
  if (!groups.length) {
    return (
      <div className="empty card">
        <p><b>No exercises match.</b></p>
        <p className="muted small">Try fewer words or filters.</p>
        <button type="button" className="btn sm" onClick={onReset}>Show all</button>
      </div>
    );
  }
  return (
    <div className="groups">
      {groups.map(({ s, items }) => (
        <section key={s.id} className="group" aria-label={s.name}>
          <div className="group-head">
            <h2>{s.name}</h2>
            <span className="muted small">{items.length}</span>
          </div>
          <ul className="card ex-list">
            {items.map((e) => <li key={e.id}>{renderRow(e)}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
