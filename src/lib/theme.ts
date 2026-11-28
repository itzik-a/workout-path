/* Light, dark, or the system's, and a style (Classic, or Bear's greys with a dark sidebar): both chosen per device
   (localStorage workoutPath.theme, nothing set is "system"; workoutPath.style, nothing set is "classic"), applied as
   <html data-theme="light|dark" data-style="classic|bear">, which styles.css keys the tokens on. index.html sets both
   before the first paint; this keeps them right when a choice or the system's appearance changes. The theme-color metas
   follow the choice (and the style's background). */
import { useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";
export type Style = "classic" | "bear";

const KEY = "workoutPath.theme";
const STYLE_KEY = "workoutPath.style";
/** the page background per style and mode, for the browser / status bar (keep in step with styles.css and index.html) */
const BARS: Record<Style, { light: string; dark: string }> = {
  classic: { light: "#F6F5F3", dark: "#0C0B0A" },
  bear: { light: "#F3F5F7", dark: "#1F2022" },
};
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const subs = new Set<() => void>();

export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "system"; } catch { return "system"; }
}

export function getStyle(): Style {
  try { return localStorage.getItem(STYLE_KEY) === "bear" ? "bear" : "classic"; } catch { return "classic"; }
}

export function setTheme(t: Theme) {
  try { if (t === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* private mode: this visit only */ }
  apply(t);
}

export function setStyle(s: Style) {
  try { if (s === "classic") localStorage.removeItem(STYLE_KEY); else localStorage.setItem(STYLE_KEY, s); } catch { /* this visit only */ }
  currentStyle = s;
  apply(current);
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useTheme = (): Theme => useSyncExternalStore(subscribe, () => current);
export const useStyle = (): Style => useSyncExternalStore(subscribe, () => currentStyle);

let current: Theme = getTheme();
let currentStyle: Style = getStyle();

function apply(t: Theme = getTheme()) {
  current = t;
  const root = document.documentElement;
  root.dataset.theme = t === "dark" || (t === "system" && dark.matches) ? "dark" : "light";
  root.dataset.style = currentStyle;
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-for]')) {
    const mode = m.dataset.for === "dark" ? "dark" : "light";
    m.content = BARS[currentStyle][mode];
    m.media = t === "system" ? `(prefers-color-scheme: ${mode})` : mode === t ? "all" : "not all";
  }
  subs.forEach((f) => f());
}

dark.addEventListener("change", () => apply(current));
window.addEventListener("storage", (e) => { // another tab chose
  if (e.key === KEY) apply();
  if (e.key === STYLE_KEY) { currentStyle = getStyle(); apply(current); }
});
apply();
