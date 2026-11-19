/* Reorder a list by dragging a handle. Pointer events, so it works with touch (iPhone)
   and mouse (Mac) alike. The dragged row follows the pointer, the others slide out of its
   way, and the list auto-scrolls near the top and bottom edges. Rows are measured once at
   the start of a drag. */
import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

interface Drag { from: number; to: number; dy: number; h: number }

function scrollParent(el: HTMLElement | null): HTMLElement {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement as HTMLElement;
}

export function useDragSort(count: number, onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);

  const rowRef = (i: number) => (el: HTMLElement | null) => { rows.current[i] = el; };

  const handleProps = (i: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || count < 2) return;
      const els = rows.current.slice(0, count);
      if (els.some((x) => !x)) return;
      e.preventDefault();
      const rects = els.map((x) => x!.getBoundingClientRect());
      const me = rects[i];
      const gap = count > 1 ? (i + 1 < count ? rects[i + 1].top - me.bottom : me.top - rects[i - 1].bottom) : 0;
      const h = me.height + gap;
      const scroller = scrollParent(els[i]);
      const top0 = scroller.scrollTop;
      const y0 = e.clientY;
      let y = y0;
      let live: Drag = { from: i, to: i, dy: 0, h };

      const compute = () => {
        const dy = y - y0 + (scroller.scrollTop - top0);
        const center = me.top + me.height / 2 + dy;
        let to = 0;
        rects.forEach((r, j) => { if (j !== i && r.top + r.height / 2 < center) to++; });
        live = { from: i, to, dy, h };
        setDrag(live);
      };

      let raf = 0;
      const tick = () => {
        const edge = 90, vh = window.innerHeight;
        const v = y < edge ? -(edge - y) / 5 : y > vh - edge ? (y - (vh - edge)) / 5 : 0;
        if (v) { scroller.scrollTop += v; compute(); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      document.documentElement.classList.add("dragging");
      const onPointerMove = (ev: PointerEvent) => { y = ev.clientY; compute(); };
      const end = () => {
        cancelAnimationFrame(raf);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
        document.documentElement.classList.remove("dragging");
        setDrag(null);
        if (live.to !== live.from) onMove(live.from, live.to);
      };
      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
      compute();
    },
  });

  const rowStyle = (i: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    const { from, to, dy, h } = drag;
    if (i === from) return { transform: `translateY(${dy}px)`, position: "relative", zIndex: 5 };
    const shift = from < to && i > from && i <= to ? -h : from > to && i >= to && i < from ? h : 0;
    return { transform: shift ? `translateY(${shift}px)` : undefined, transition: "transform .18s ease" };
  };

  return { rowRef, handleProps, rowStyle, dragging: drag ? drag.from : -1 };
}
