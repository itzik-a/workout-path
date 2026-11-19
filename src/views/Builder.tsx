/* Workout builder: name, blocks (single exercises, supersets, circuits), dose editing,
   reordering, and the exercise picker (a sheet on the phone, a side pane on the Mac). */
import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Exercise, Mode } from "../data/catalog";
import { FilterBar, GroupedList, rowMeta, useFilteredExercises } from "../components/ExerciseBrowser";
import { IconBack, IconCheck, IconGrip, IconPlay, IconPlus } from "../components/Icons";
import { Menu, Seg, Select, Stepper, useMedia, type MenuItem } from "../components/ui";
import { NO_FILTERS } from "../lib/filter";
import { showToast } from "../lib/toast";
import { useDragSort } from "../lib/useDragSort";
import { GROUP_LABEL, allExercises, blockSummary, getExercise, itemParts, itemSummary, itemTitle, workoutSummary } from "../lib/workout";
import {
  addExercise, deleteBlock, duplicateItem, duplicateWorkout, groupWithNext, moveBlock, moveItem,
  removeItem, renameWorkout, restoreWorkout, setVariation, takeOutOfGroup, ungroup, updateBlock, updateItem,
} from "../state/actions";
import { useAppState, type Block, type Item, type Workout } from "../state/store";
import { deleteWithUndo } from "./Workouts";
import { startWorkout } from "./Player";

/** Drag type for exercises dragged from the picker into the workout (Mac). */
const DND = "application/x-workout-exercise";

type Handle = { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
type AddAt = { index?: number; blockId?: string };

interface Ctx {
  w: Workout;
  custom: Exercise[];
  open: string | null;
  setOpen: (id: string | null) => void;
  withUndo: (text: string, fn: () => void) => void;
  onAddTo: (blockId: string) => void;
}

export function Builder({ id }: { id: string }) {
  const s = useAppState();
  const w = s.workouts.find((x) => x.id === id && !x.deletedAt);
  const [open, setOpen] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ open: boolean; blockId?: string }>({ open: false });
  const search = useRef<HTMLInputElement>(null);
  const wide = useMedia("(min-width: 1024px)");
  const sheet = picker.open && !wide;

  // The phone sheet covers the page: stop the page behind it from scrolling; Esc closes it.
  useEffect(() => {
    document.documentElement.classList.toggle("sheet-open", sheet);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && sheet) setPicker({ open: false }); };
    window.addEventListener("keydown", key);
    return () => { document.documentElement.classList.remove("sheet-open"); window.removeEventListener("keydown", key); };
  }, [sheet]);

  if (!w) {
    return (
      <div className="pick">
        <p><b>This workout isn't here.</b> It may have been deleted.</p>
        <a className="btn sm" href="#workouts">Back to workouts</a>
      </div>
    );
  }

  const custom = s.customExercises;
  const withUndo = (text: string, fn: () => void) => {
    const snap = structuredClone(w);
    fn();
    showToast(text, { label: "Undo", run: () => restoreWorkout(snap) });
  };
  const add = (exId: string, at: AddAt) =>
    withUndo(`Added ${getExercise(exId, custom)?.name ?? "exercise"}`, () => addExercise(w.id, exId, at));
  const openPicker = (blockId?: string) => {
    setPicker({ open: true, blockId });
    if (wide) requestAnimationFrame(() => search.current?.focus());
  };

  const target = picker.blockId ? w.blocks.find((b) => b.id === picker.blockId && b.kind !== "straight") : undefined;
  const counts = new Map<string, number>();
  w.blocks.forEach((b) => b.items.forEach((it) => counts.set(it.exerciseId, (counts.get(it.exerciseId) ?? 0) + 1)));
  const ctx: Ctx = { w, custom, open, setOpen, withUndo, onAddTo: openPicker };

  return (
    <div className="builder-layout">
      <section className="pane builder-pane" aria-label="Workout">
        <div className="builder-inner">
          <a className="back" href="#workouts"><IconBack /> Workouts</a>
          <header className="builder-head">
            <input
              className="title-input"
              value={w.name}
              placeholder="Workout name"
              aria-label="Workout name"
              onChange={(e) => renameWorkout(w.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
            <button type="button" className="btn primary sm start-btn" disabled={!w.blocks.length} onClick={() => startWorkout(w)}>
              <IconPlay width={16} height={16} /> Start
            </button>
            <Menu
              label="Workout options"
              items={[
                { label: "Duplicate workout", onSelect: () => {
                  const nid = duplicateWorkout(w.id);
                  if (nid) { location.hash = `#workouts/${nid}`; showToast("Duplicated. You're editing the copy."); }
                } },
                { label: "Delete workout", danger: true, onSelect: () => { location.hash = "#workouts"; deleteWithUndo(w); } },
              ]}
            />
          </header>
          {w.blocks.length > 0 && <p className="muted small builder-meta">{workoutSummary(w, custom)}</p>}

          <BlockList ctx={ctx} onDropExercise={add} />

          <button type="button" className="btn primary add-btn" onClick={() => openPicker()}>
            <IconPlus /> Add exercise
          </button>
        </div>
      </section>

      <Picker
        open={picker.open}
        target={target}
        counts={counts}
        custom={custom}
        searchRef={search}
        onAdd={(exId) => add(exId, target ? { blockId: target.id } : {})}
        onClose={() => setPicker({ open: false })}
        onClearTarget={() => setPicker((p) => ({ ...p, blockId: undefined }))}
      />
    </div>
  );
}

// ── Blocks ──────────────────────────────────────────────────────

function BlockList({ ctx, onDropExercise }: { ctx: Ctx; onDropExercise: (exId: string, at: AddAt) => void }) {
  const { w } = ctx;
  const sort = useDragSort(w.blocks.length, (from, to) => moveBlock(w.id, from, to));
  const [drop, setDrop] = useState<AddAt | null>(null);
  const list = useRef<HTMLOListElement>(null);

  // Exercises dragged in from the picker (Mac): onto a group joins it, elsewhere inserts between blocks.
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DND)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const group = (e.target as HTMLElement).closest<HTMLElement>("[data-group]")?.dataset.group;
    let next: AddAt;
    if (group) next = { blockId: group };
    else {
      const rows = [...(list.current?.querySelectorAll<HTMLElement>(":scope > li[data-row]") ?? [])];
      const i = rows.findIndex((r) => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
      next = { index: i < 0 ? rows.length : i };
    }
    if (next.blockId !== drop?.blockId || next.index !== drop?.index) setDrop(next);
  };
  const onDrop = (e: DragEvent) => {
    const exId = e.dataTransfer.getData(DND);
    const at = drop;
    setDrop(null);
    if (!exId || !at) return;
    e.preventDefault();
    onDropExercise(exId, at);
  };
  const onDragLeave = (e: DragEvent) => {
    if (!list.current?.contains(e.relatedTarget as Node)) setDrop(null);
  };

  const last = w.blocks.length - 1;
  return (
    <ol
      ref={list}
      className={`blocks${drop && drop.index === w.blocks.length ? " drop-end" : ""}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      {w.blocks.map((b, bi) => {
        const prev = w.blocks[bi - 1], next = w.blocks[bi + 1];
        const blockMoves: MenuItem[] = [
          { label: "Move up", hidden: bi === 0, onSelect: () => moveBlock(w.id, bi, bi - 1) },
          { label: "Move down", hidden: bi === last, onSelect: () => moveBlock(w.id, bi, bi + 1) },
        ];
        const cls = [sort.dragging === bi && "is-dragging", drop?.index === bi && "drop-before"].filter(Boolean).join(" ");
        return (
          <li key={b.id} data-row ref={sort.rowRef(bi)} style={sort.rowStyle(bi)} className={cls || undefined}>
            {b.kind === "straight" ? (
              <ItemCard
                ctx={ctx}
                item={b.items[0]}
                inGroup={false}
                handle={sort.handleProps(bi)}
                menu={(name) => [
                  ...blockMoves,
                  { label: next?.kind === "straight" ? "Superset with next" : `Join next ${next ? GROUP_LABEL[next.kind].toLowerCase() : ""}`, hidden: !next, onSelect: () => groupWithNext(w.id, b.id) },
                  { label: `Join ${prev ? GROUP_LABEL[prev.kind].toLowerCase() : ""} above`, hidden: !prev || prev.kind === "straight", onSelect: () => groupWithNext(w.id, prev!.id) },
                  { label: "Duplicate", onSelect: () => duplicateItem(w.id, b.items[0].id) },
                  { label: "Remove", danger: true, onSelect: () => ctx.withUndo(`Removed ${name}`, () => removeItem(w.id, b.items[0].id)) },
                ]}
              />
            ) : (
              <GroupCard ctx={ctx} b={b} bi={bi} handle={sort.handleProps(bi)} dropping={drop?.blockId === b.id} moves={blockMoves} />
            )}
          </li>
        );
      })}
      {w.blocks.length === 0 && (
        <li className={`card empty builder-empty${drop ? " drop-target" : ""}`}>
          <p><b>No exercises yet.</b></p>
          <p className="muted small">
            <span className="narrow-only">Tap Add exercise to pick from the catalog.</span>
            <span className="wide-only">Click an exercise on the right, or drag it here.</span>
          </p>
        </li>
      )}
    </ol>
  );
}

function GroupCard({ ctx, b, bi, handle, dropping, moves }: {
  ctx: Ctx; b: Block; bi: number; handle: Handle; dropping: boolean; moves: MenuItem[];
}) {
  const { w, open, setOpen, withUndo } = ctx;
  const sort = useDragSort(b.items.length, (from, to) => moveItem(w.id, b.id, from, to));
  const settings = open === b.id;
  const kind = GROUP_LABEL[b.kind];
  const next = w.blocks[bi + 1];
  const lastItem = b.items.length - 1;

  return (
    <div className={`group-card${dropping ? " drop-target" : ""}`} data-group={b.id}>
      <div className={`item-card group-top${settings ? " open" : ""}`}>
        <button type="button" className="handle" tabIndex={-1} aria-label={`Drag to reorder ${kind}`} {...handle}><IconGrip /></button>
        <button type="button" className="item-toggle" aria-expanded={settings} onClick={() => setOpen(settings ? null : b.id)}>
          <span className="group-kind">{kind}</span>
          <span className="item-dose">{blockSummary(b)}</span>
        </button>
        <Menu
          label={`More for ${kind}`}
          items={[
            ...moves,
            { label: `Add exercise to ${kind.toLowerCase()}`, onSelect: () => ctx.onAddTo(b.id) },
            { label: next?.kind === "straight" ? "Add next exercise to it" : `Merge with next ${next ? GROUP_LABEL[next.kind].toLowerCase() : ""}`, hidden: !next, onSelect: () => groupWithNext(w.id, b.id) },
            { label: "Ungroup", onSelect: () => withUndo(`Ungrouped ${kind.toLowerCase()}`, () => ungroup(w.id, b.id)) },
            { label: `Delete ${kind.toLowerCase()}`, danger: true, onSelect: () => withUndo(`Deleted ${kind.toLowerCase()}`, () => deleteBlock(w.id, b.id)) },
          ]}
        />
        {settings && (
          <div className="item-editor">
            <Seg
              label="Group type"
              value={b.kind === "circuit" ? "circuit" : "superset"}
              options={[{ value: "superset", label: "Superset" }, { value: "circuit", label: "Circuit" }]}
              onChange={(kind) => updateBlock(w.id, b.id, { kind })}
            />
            <div className="dose-row">
              <Stepper label="Rounds" value={b.rounds} min={1} max={20} onChange={(rounds) => updateBlock(w.id, b.id, { rounds })} />
              <Stepper label="Rest between rounds" value={b.restBetween} min={0} max={600} step={15} unit="s" onChange={(restBetween) => updateBlock(w.id, b.id, { restBetween })} />
            </div>
          </div>
        )}
      </div>

      <ol className="group-items">
        {b.items.map((it, ii) => (
          <li key={it.id} ref={sort.rowRef(ii)} style={sort.rowStyle(ii)} className={sort.dragging === ii ? "is-dragging" : undefined}>
            <ItemCard
              ctx={ctx}
              item={it}
              inGroup
              handle={sort.handleProps(ii)}
              menu={(name) => [
                { label: "Move up", hidden: ii === 0, onSelect: () => moveItem(w.id, b.id, ii, ii - 1) },
                { label: "Move down", hidden: ii === lastItem, onSelect: () => moveItem(w.id, b.id, ii, ii + 1) },
                { label: `Take out of ${kind.toLowerCase()}`, onSelect: () => takeOutOfGroup(w.id, it.id) },
                { label: "Duplicate", onSelect: () => duplicateItem(w.id, it.id) },
                { label: "Remove", danger: true, onSelect: () => withUndo(`Removed ${name}`, () => removeItem(w.id, it.id)) },
              ]}
            />
          </li>
        ))}
      </ol>
      <button type="button" className="btn ghost sm group-add" onClick={() => ctx.onAddTo(b.id)}>
        <IconPlus /> Add to {kind.toLowerCase()}
      </button>
    </div>
  );
}

function ItemCard({ ctx, item, inGroup, handle, menu }: {
  ctx: Ctx; item: Item; inGroup: boolean; handle: Handle; menu: (name: string) => MenuItem[];
}) {
  const { ex, v, mode } = itemParts(item, ctx.custom);
  const title = itemTitle(ex, v);
  const name = title.main;
  const isOpen = ctx.open === item.id;
  return (
    <div className={`item-card${isOpen ? " open" : ""}${inGroup ? " in-group" : ""}`}>
      <button type="button" className="handle" tabIndex={-1} aria-label={`Drag to reorder ${name}`} {...handle}><IconGrip /></button>
      <button type="button" className="item-toggle" aria-expanded={isOpen} onClick={() => ctx.setOpen(isOpen ? null : item.id)}>
        <span className="item-name">{name}{title.sub && <span className="item-var"> · {title.sub}</span>}</span>
        <span className="item-dose">{itemSummary(item, mode, inGroup)}</span>
      </button>
      <Menu label={`More for ${name}`} items={menu(name)} />
      {isOpen && <ItemEditor wid={ctx.w.id} item={item} ex={ex} mode={mode} inGroup={inGroup} />}
    </div>
  );
}

function ItemEditor({ wid, item, ex, mode, inGroup }: { wid: string; item: Item; ex?: Exercise; mode: Mode; inGroup: boolean }) {
  const set = (patch: Partial<Item>) => updateItem(wid, item.id, patch);
  const side = item.perSide ? " / side" : "";
  return (
    <div className="item-editor">
      {ex?.variations?.length ? (
        <Select
          label="Variation"
          value={item.variationId ?? ex.variations[0].id}
          options={ex.variations.map((x) => ({ value: x.id, label: x.name }))}
          onChange={(vid) => setVariation(wid, item.id, vid)}
        />
      ) : null}
      <div className="dose-row">
        {!inGroup && <Stepper label="Sets" value={item.sets} min={1} max={20} onChange={(sets) => set({ sets })} />}
        {mode === "reps" && <Stepper label={`Reps${side}`} value={item.reps ?? 0} min={1} max={300} onChange={(reps) => set({ reps })} />}
        {mode === "hold" && <Stepper label={`Hold${side}`} value={item.seconds ?? 0} min={1} max={900} step={5} unit="s" onChange={(seconds) => set({ seconds })} />}
        {mode === "time" && <Stepper label={`Time${side}`} value={item.minutes ?? 0} min={1} max={240} unit="min" onChange={(minutes) => set({ minutes })} />}
        <Stepper label={inGroup ? "Rest after" : "Rest"} value={item.rest} min={0} max={900} step={15} unit="s" onChange={(rest) => set({ rest })} />
        <Stepper label="Weight" value={item.kg ?? 0} min={0} max={300} unit="kg" decimal onChange={(kg) => set({ kg })} />
      </div>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={!!item.perSide} onClick={() => set({ perSide: !item.perSide })}>Per side</button>
      </div>
    </div>
  );
}

// ── Picker ──────────────────────────────────────────────────────

function Picker({ open, target, counts, custom, searchRef, onAdd, onClose, onClearTarget }: {
  open: boolean;
  target?: Block;
  counts: Map<string, number>;
  custom: Exercise[];
  searchRef: RefObject<HTMLInputElement | null>;
  onAdd: (exId: string) => void;
  onClose: () => void;
  onClearTarget: () => void;
}) {
  const { f, setF, list } = useFilteredExercises("workoutPath.pickerFilters", allExercises(custom));
  const kind = target ? GROUP_LABEL[target.kind].toLowerCase() : "";
  return (
    <aside className={`pane picker-pane${open ? " open" : ""}`} aria-label="Add exercises">
      <div className="picker-head">
        <div className="picker-title">
          <h2>{target ? `Add to ${kind}` : "Add exercise"}</h2>
          {target ? (
            <button type="button" className="text-btn" onClick={onClearTarget}>Add as single exercises instead</button>
          ) : (
            <p className="muted small">
              <span className="narrow-only">Tap to add. Add as many as you like.</span>
              <span className="wide-only">Click to add to the end, or drag into the workout.</span>
            </p>
          )}
        </div>
        <button type="button" className="btn sm primary picker-done" onClick={onClose}>Done</button>
      </div>
      <FilterBar f={f} setF={setF} searchRef={searchRef} />
      <GroupedList
        list={list}
        onReset={() => setF(() => NO_FILTERS)}
        renderRow={(ex) => {
          const n = counts.get(ex.id) ?? 0;
          return (
            <button
              type="button"
              className="ex-row pick-row"
              draggable
              onDragStart={(e) => { e.dataTransfer.setData(DND, ex.id); e.dataTransfer.effectAllowed = "copy"; }}
              onClick={() => onAdd(ex.id)}
              aria-label={`Add ${ex.name}${n ? `, ${n} in this workout` : ""}`}
            >
              <span className="ex-main">
                <span className="ex-name">{ex.name}</span>
                <span className="ex-meta">{rowMeta(ex)}</span>
              </span>
              {n > 0 ? <span className="tag accent in-workout"><IconCheck /> {n}</span> : <span />}
              <span className="add-dot"><IconPlus /></span>
            </button>
          );
        }}
      />
    </aside>
  );
}
