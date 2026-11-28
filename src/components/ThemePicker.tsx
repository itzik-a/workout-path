/* System / Light / Dark, and Classic / Bear, for this device (src/lib/theme.ts). */
import { setStyle, setTheme, useStyle, useTheme, type Style, type Theme } from "../lib/theme";

const OPTIONS: { id: Theme; label: string }[] = [{ id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }];
const STYLES: { id: Style; label: string }[] = [{ id: "classic", label: "Classic" }, { id: "bear", label: "Bear" }];

export function ThemePicker() {
  const theme = useTheme();
  return (
    <div className="seg theme-seg" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" aria-pressed={theme === o.id} onClick={() => setTheme(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function StylePicker() {
  const style = useStyle();
  return (
    <div className="seg theme-seg" role="group" aria-label="Style">
      {STYLES.map((o) => (
        <button key={o.id} type="button" aria-pressed={style === o.id} onClick={() => setStyle(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
