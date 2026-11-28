/* Tapping the dimmed backdrop around a modal <dialog> closes it. The dialog element is also the target of a click on
   its own scrollbar, on a gap in the sheet, or of a text selection that ends outside a field, so a close needs both
   the press and the release outside the dialog's box (the backdrop is everything around it). Spread the result on
   the <dialog>: <dialog ref={ref} {...backdropClose(ref)}>. */
import type { MouseEvent, PointerEvent, RefObject } from "react";

/** dialogs whose current press started on the backdrop (kept here, not in state, so a re-render can't lose it) */
const pressed = new WeakSet<HTMLDialogElement>();

function onBackdrop(d: HTMLDialogElement | null, e: { target: EventTarget; clientX: number; clientY: number }): d is HTMLDialogElement {
  if (!d || e.target !== d) return false;
  const r = d.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

export function backdropClose(ref: RefObject<HTMLDialogElement | null>, close: () => void = () => ref.current?.close()) {
  return {
    onPointerDown: (e: PointerEvent<HTMLDialogElement>) => {
      const d = ref.current;
      if (!d) return;
      if (onBackdrop(d, e)) pressed.add(d); else pressed.delete(d);
    },
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      const d = ref.current;
      if (!d) return;
      const was = pressed.has(d);
      pressed.delete(d);
      if (was && onBackdrop(d, e)) close();
    },
  };
}
