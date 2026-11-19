import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  EQUIPMENT_LABEL, EXERCISES, MODE_LABEL, REGION_LABEL, SECTIONS, exerciseById,
  type Equipment, type Exercise, type Mode, type Region, type SectionId,
} from "../data/catalog";
import { ChipGroup, useSessionState } from "../components/ui";
import { IconChevronRight, IconClose, IconFilter, IconSearch } from "../components/Icons";
import { NO_FILTERS, activeCount, matches, type Filters } from "../lib/filter";
import { formatDose, plural } from "../lib/format";
import { ExerciseDetail } from "./ExerciseDetail";

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

/** Window scroll of the list on narrow screens, restored when coming back from a detail. */
let listScroll = 0;

export function Catalog({ selected }: { selected?: string }) {
  const [f, setF] = useSessionState<Filters>("workoutPath.catalogFilters", NO_FILTERS);
  const [showFilters, setShowFilters] = useState(() => activeCount(f) > 0);
  const search = useRef<HTMLInputElement>(null);
  const detailPane = useRef<HTMLElement>(null);

  const list = useMemo(() => EXERCISES.filter((e) => matches(e, f)), [f]);
  const groups = SECTIONS.map((s) => ({ s, items: list.filter((e) => e.section === s.id) })).filter((g) => g.items.length);
  const ex = selected ? exerciseById(selected) : undefined;
  const n = activeCount(f);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));

  // Narrow screens show list or detail: start a detail at the top, return to where the list was.
  const prevSelected = useRef(selected);
  useLayoutEffect(() => {
    if (selected) {
      window.scrollTo(0, 0);
      detailPane.current?.scrollTo(0, 0);
    } else if (prevSelected.current) {
      window.scrollTo(0, listScroll);
    }
    prevSelected.current = selected;
  }, [selected]);

  // Mac keyboard: "/" to search, ↑ ↓ to move through the list, Esc to close the detail.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) { e.preventDefault(); search.current?.focus(); return; }
      if (e.key === "Escape") {
        if (typing) (e.target as HTMLElement).blur();
        else if (selected) location.hash = "#catalog";
        return;
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !typing && list.length) {
        e.preventDefault();
        const i = list.findIndex((x) => x.id === selected);
        const next = e.key === "ArrowDown" ? Math.min(list.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
        location.hash = `#catalog/${list[next].id}`;
        document.getElementById(`ex-${list[next].id}`)?.scrollIntoView({ block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list, selected]);

  return (
    <div className={`catalog${selected ? " has-detail" : ""}`}>
      <section className="pane list-pane" aria-label="Exercises">
        <div className="page-head">
          <h1 className="display">Catalog</h1>
          <p className="muted small">
            {list.length === EXERCISES.length ? plural(EXERCISES.length, "exercise") : `${list.length} of ${EXERCISES.length} exercises`}
          </p>
        </div>

        <div className="search-row">
          <label className="search">
            <IconSearch />
            <input
              ref={search}
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
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { set({ q: "" }); search.current?.focus(); }}>
                <IconClose />
              </button>
            )}
          </label>
          <button
            type="button"
            className={`btn filter-btn${n ? " on" : ""}`}
            aria-expanded={showFilters}
            aria-controls="filters"
            onClick={() => setShowFilters((v) => !v)}
          >
            <IconFilter />
            <span>Filters{n ? ` · ${n}` : ""}</span>
          </button>
        </div>

        {showFilters && (
          <div className="filters" id="filters">
            <ChipGroup label="Body" options={REGIONS} value={f.regions} onChange={(regions) => set({ regions })} />
            <ChipGroup label="Type" options={MODES} value={f.modes} onChange={(modes) => set({ modes })} />
            <ChipGroup label="Equipment" options={EQUIPMENT_OPTS} value={f.equipment} onChange={(equipment) => set({ equipment })} />
            <ChipGroup label="Section" options={SECTION_OPTS} value={f.sections} onChange={(sections) => set({ sections })} />
            {n > 0 && (
              <button type="button" className="btn ghost sm clear-all" onClick={() => setF({ ...NO_FILTERS, q: f.q })}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="empty card">
            <p><b>No exercises match.</b></p>
            <p className="muted small">Try fewer words or filters.</p>
            <button type="button" className="btn sm" onClick={() => setF(NO_FILTERS)}>Show all</button>
          </div>
        ) : (
          <div className="groups">
            {groups.map(({ s, items }) => (
              <section key={s.id} className="group" aria-labelledby={`sec-${s.id}`}>
                <div className="group-head">
                  <h2 id={`sec-${s.id}`}>{s.name}</h2>
                  <span className="muted small">{items.length}</span>
                </div>
                <ul className="card ex-list">
                  {items.map((e) => <Row key={e.id} ex={e} current={e.id === selected} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="pane detail-pane" ref={detailPane} aria-label="Exercise">
        {ex ? <ExerciseDetail ex={ex} /> : selected ? <NotFound /> : <Pick />}
      </section>
    </div>
  );
}

function Row({ ex, current }: { ex: Exercise; current: boolean }) {
  const meta = [formatDose(ex.dose, ex.mode, ex.perSide)];
  if (ex.variations?.length) meta.push(plural(ex.variations.length, "variation"));
  return (
    <li>
      <a
        id={`ex-${ex.id}`}
        className="ex-row"
        href={`#catalog/${ex.id}`}
        aria-current={current ? "true" : undefined}
        onClick={() => { listScroll = window.scrollY; }}
      >
        <span className="ex-main">
          <span className="ex-name">{ex.name}</span>
          <span className="ex-meta">{meta.join(" · ")}</span>
        </span>
        <span className={`tag mode-${ex.mode}`}>{MODE_LABEL[ex.mode]}</span>
        <IconChevronRight className="ex-chev" />
      </a>
    </li>
  );
}

function Pick() {
  return (
    <div className="pick">
      <p className="muted">Pick an exercise to see its cue, variations and default dose.</p>
      <p className="muted small">Keyboard: <kbd>/</kbd> search · <kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Esc</kbd> close</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="pick">
      <p><b>That exercise isn't in the catalog.</b></p>
      <a className="btn sm" href="#catalog">Back to the catalog</a>
    </div>
  );
}
