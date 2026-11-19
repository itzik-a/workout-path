import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronDown, IconMinus, IconMore, IconPlus } from "./Icons";

/** useState that survives tab switches and reloads within this browser session. */
export function useSessionState<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) return { ...initial, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return initial;
  });
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key, v]);
  return [v, setV] as const;
}

/** A row of toggle chips; any number can be on. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="chip-group" role="group" aria-label={label}>
      <span className="eyebrow">{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button type="button" key={o.value} className="chip" aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Segmented control: exactly one option on. */
export function Seg<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Number field that lets you clear it while typing; commits every valid value. */
export function NumberInput({ value, onChange, min = 0, max = 9999, decimal, label }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; decimal?: boolean; label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="num"
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      aria-label={label}
      value={draft ?? String(value)}
      onFocus={(e) => { setDraft(String(value)); const el = e.currentTarget; requestAnimationFrame(() => el.select()); }}
      onChange={(e) => {
        setDraft(e.target.value);
        const t = e.target.value.replace(",", ".");
        const n = decimal ? parseFloat(t) : parseInt(t, 10);
        if (Number.isFinite(n)) onChange(clamp(n, min, max));
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

/** − value + with a label above. */
export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, unit, decimal }: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; unit?: string; decimal?: boolean;
}) {
  const set = (n: number) => onChange(clamp(Math.round(n * 100) / 100, min, max));
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctl">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => set(value - step)}><IconMinus /></button>
        <span className="stepper-value">
          <NumberInput value={value} onChange={onChange} min={min} max={max} decimal={decimal} label={label} />
          {unit && <span className="unit">{unit}</span>}
        </span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => set(value + step)}><IconPlus /></button>
      </div>
    </div>
  );
}

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean; hidden?: boolean }

/** "⋯" button with a small popover list. Opens upward when there's no room below. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shown = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button" className="icon-btn subtle" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setUp(r.bottom + shown.length * 46 + 90 > window.innerHeight);
          setOpen((o) => !o);
        }}
      >
        <IconMore />
      </button>
      {open && (
        <div className={`menu-list${up ? " up" : ""}`} role="menu">
          {shown.map((i) => (
            <button type="button" role="menuitem" key={i.label} className={i.danger ? "danger" : undefined} onClick={() => { setOpen(false); i.onSelect(); }}>
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Native select, styled. */
export function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <label className="select">
      <span className="stepper-label">{label}</span>
      <span className="select-box">
        <select value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <IconChevronDown />
      </span>
    </label>
  );
}

/** True while a media query matches. */
export function useMedia(query: string) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

/** Progress ring; sized by CSS (the SVG scales to its box). */
export function Ring({ value, className, children }: { value: number; className?: string; children?: ReactNode }) {
  const r = 92, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className={`ring${className ? " " + className : ""}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--track)" strokeWidth="10" />
        <circle
          cx="100" cy="100" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 100 100)" className="ring-arc"
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}
