/* One toast at a time, e.g. "Removed Plank · Undo". */
import { useSyncExternalStore } from "react";

export interface ToastMsg { id: number; text: string; action?: { label: string; run: () => void } }

let current: ToastMsg | null = null;
let n = 0;
let timer = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(text: string, action?: ToastMsg["action"]) {
  current = { id: ++n, text, action };
  emit();
  clearTimeout(timer);
  timer = window.setTimeout(hideToast, action ? 6000 : 2500);
}

export function hideToast() {
  current = null;
  emit();
}

export function useToast() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current);
}
