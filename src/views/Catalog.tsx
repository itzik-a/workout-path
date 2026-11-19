import { useEffect, useLayoutEffect, useRef } from "react";
import { MODE_LABEL, type Exercise } from "../data/catalog";
import { IconChevronRight } from "../components/Icons";
import { FilterBar, GroupedList, countLabel, rowMeta, useFilteredExercises } from "../components/ExerciseBrowser";
import { NO_FILTERS } from "../lib/filter";
import { allExercises, getExercise } from "../lib/workout";
import { useAppState } from "../state/store";
import { ExerciseDetail } from "./ExerciseDetail";

/** Window scroll of the list on narrow screens, restored when coming back from a detail. */
let listScroll = 0;

export function Catalog({ selected }: { selected?: string }) {
  const { customExercises } = useAppState();
  const all = allExercises(customExercises);
  const { f, setF, list } = useFilteredExercises("workoutPath.catalogFilters", all);
  const search = useRef<HTMLInputElement>(null);
  const detailPane = useRef<HTMLElement>(null);
  const ex = selected ? getExercise(selected, customExercises) : undefined;

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
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
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
          <p className="muted small">{countLabel(list.length, all.length)}</p>
        </div>
        <FilterBar f={f} setF={setF} searchRef={search} />
        <GroupedList list={list} onReset={() => setF(() => NO_FILTERS)} renderRow={(e) => <Row ex={e} current={e.id === selected} />} />
      </section>

      <section className="pane detail-pane" ref={detailPane} aria-label="Exercise">
        {ex ? <ExerciseDetail ex={ex} /> : selected ? <NotFound /> : <Pick />}
      </section>
    </div>
  );
}

function Row({ ex, current }: { ex: Exercise; current: boolean }) {
  return (
    <a
      id={`ex-${ex.id}`}
      className="ex-row"
      href={`#catalog/${ex.id}`}
      aria-current={current ? "true" : undefined}
      onClick={() => { listScroll = window.scrollY; }}
    >
      <span className="ex-main">
        <span className="ex-name">{ex.name}</span>
        <span className="ex-meta">{rowMeta(ex)}</span>
      </span>
      <span className={`tag mode-${ex.mode}`}>{MODE_LABEL[ex.mode]}</span>
      <IconChevronRight className="ex-chev" />
    </a>
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
