import { useEffect, useState } from "react";

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
