import {
  EQUIPMENT_LABEL, FOCUS_TERMS, focusOf, sectionById,
  type Equipment, type Exercise, type Focus, type Mode, type Region, type SectionId,
} from "../data/catalog";

export interface Filters {
  q: string;
  regions: Region[];
  modes: Mode[];
  /** "none" = needs no equipment */
  equipment: (Equipment | "none")[];
  sections: SectionId[];
  /** The focus chips above the list (Strength, Isometric, …). Not counted in `activeCount`. */
  focus: Focus[];
}

export const NO_FILTERS: Filters = { q: "", regions: [], modes: [], equipment: [], sections: [], focus: [] };

export const activeCount = (f: Filters) => f.regions.length + f.modes.length + f.equipment.length + f.sections.length;

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Text the search box matches against. */
function haystack(e: Exercise): string {
  return fold([
    e.name,
    ...(e.aliases ?? []),
    ...(e.variations ?? []).map((v) => v.name),
    sectionById(e.section).name,
    ...(e.equipment ?? []).map((q) => EQUIPMENT_LABEL[q]),
    ...focusOf(e).flatMap((x) => FOCUS_TERMS[x]),
  ].join(" "));
}

/** Within one filter group any chip matches (OR); across groups all must match (AND).
    Every word typed must appear somewhere in the name, aliases, variations, section, equipment or
    focus words; a trailing "s" is optional ("isometrics", "planks"). */
export function matches(e: Exercise, f: Filters): boolean {
  if (f.regions.length && !e.regions.some((r) => f.regions.includes(r))) return false;
  if (f.modes.length) {
    const modes = [e.mode, ...(e.variations ?? []).map((v) => v.mode ?? e.mode)];
    if (!modes.some((m) => f.modes.includes(m))) return false;
  }
  if (f.equipment.length) {
    const eq = e.equipment ?? [];
    const ok = f.equipment.some((q) => (q === "none" ? eq.length === 0 : eq.includes(q)));
    if (!ok) return false;
  }
  if (f.sections.length && !f.sections.includes(e.section)) return false;
  if (f.focus?.length && !focusOf(e).some((x) => f.focus.includes(x))) return false;
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  if (words.length) {
    const h = haystack(e);
    if (!words.every((w) => h.includes(w) || (w.length > 3 && w.endsWith("s") && h.includes(w.slice(0, -1))))) return false;
  }
  return true;
}
