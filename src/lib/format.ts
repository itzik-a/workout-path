import type { Dose, Exercise, Mode, Variation } from "../data/catalog";

/** "3 × 10", "3 × 45 s", "10 reps", "20 min", "3 × 8 · 12 kg". */
export function formatDose(dose: Dose, mode: Mode, perSide?: boolean): string {
  const amount =
    mode === "reps" ? `${dose.reps ?? "?"}` :
    mode === "hold" ? formatSeconds(dose.seconds ?? 0) :
    `${dose.minutes ?? "?"} min`;
  let out = dose.sets > 1 ? `${dose.sets} × ${amount}` : mode === "reps" ? `${amount} reps` : amount;
  if (perSide) out += " per side";
  if (dose.kg) out += ` · ${dose.kg} kg`;
  return out;
}

/** 45 → "45 s", 120 → "2 min", 90 → "1:30 min". */
export function formatSeconds(s: number): string {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}:${String(r).padStart(2, "0")} min` : `${m} min`;
}

/** A variation's effective mode and dose (it can override the exercise's). */
export function variationDose(ex: Exercise, v: Variation) {
  const mode = v.mode ?? ex.mode;
  return { mode, dose: v.dose ?? ex.dose, overridden: !!(v.mode || v.dose) };
}

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** Length of a workout: "45 s", "22 min", "1 h 05 min". */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
