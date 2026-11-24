/* Light, dark, or the system's: chosen per device (localStorage workoutPath.theme; nothing set is "system"), applied as
   <html data-theme="light|dark">, which styles.css keys the dark tokens on. index.html sets it before the first paint;
   this keeps it right when the choice or the system's appearance changes. The theme-color metas follow the choice. */
import { useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";

const KEY = "workoutPath.theme";
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const subs = new Set<() => void>();

export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "system"; } catch { return "system"; }
}

export function setTheme(t: Theme) {
  try { if (t === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* private mode: this visit only */ }
  apply(t);
}

export function useTheme(): Theme {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getTheme);
}

let current: Theme = getTheme();

function apply(t: Theme = getTheme()) {
  current = t;
  document.documentElement.dataset.theme = t === "dark" || (t === "system" && dark.matches) ? "dark" : "light";
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-for]')) {
    m.media = t === "system" ? `(prefers-color-scheme: ${m.dataset.for})` : m.dataset.for === t ? "all" : "not all";
  }
  subs.forEach((f) => f());
}

dark.addEventListener("change", () => apply(current));
window.addEventListener("storage", (e) => { if (e.key === KEY) apply(); }); // another tab chose
apply();
