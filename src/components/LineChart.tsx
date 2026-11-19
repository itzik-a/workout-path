/* One-series line chart over time (SVG, no library). Marks follow the dataviz specs:
   2px line, ~10% area wash, r=4 dots with a 2px surface ring, hairline solid grid,
   end value labelled, the rest via axis + crosshair tooltip (pointer, touch and arrow keys). */
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface ChartPoint { t: number; v: number; label: string }

/** 1, 2, 5 × 10^k at or above x. */
function niceStep(x: number) {
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export function LineChart({ points, format, tick, title, height = 210 }: {
  points: ChartPoint[];
  /** value as shown in the tooltip and end label */
  format: (v: number) => string;
  /** value as shown on the y-axis (shorter) */
  tick?: (v: number) => string;
  /** accessible name */
  title: string;
  height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!points.length) return null;
  const fmtTick = tick ?? format;
  const padL = 46, padR = 18, padT = 26, padB = 28;
  const iw = Math.max(40, w - padL - padR), ih = height - padT - padB;
  const t0 = points[0].t, t1 = points[points.length - 1].t, span = t1 - t0 || 1;
  const x = (t: number) => (points.length === 1 ? padL + iw / 2 : padL + ((t - t0) / span) * iw);
  const maxV = Math.max(...points.map((p) => p.v), 1);
  const step = niceStep(maxV / 3);
  const top = Math.ceil(maxV / step) * step;
  const y = (v: number) => padT + ih - (v / top) * ih;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${line}L${x(t1).toFixed(1)},${y(0)}L${x(t0).toFixed(1)},${y(0)}Z`;

  // Up to 4 date labels along the bottom, evenly picked, never repeating a label.
  const nx = Math.min(points.length, w < 420 ? 3 : 4);
  const xIdx = [...new Set(Array.from({ length: nx }, (_, k) => Math.round((k * (points.length - 1)) / Math.max(1, nx - 1))))];
  const xLabels = xIdx.filter((i, k, arr) => k === 0 || points[i].label !== points[arr[k - 1]].label);

  const nearest = (px: number) => {
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.t) - px) < Math.abs(x(points[best].t) - px)) best = i; });
    return best;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(nearest(e.clientX - r.left));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = active ?? points.length - 1;
    setActive(Math.max(0, Math.min(points.length - 1, i + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const last = points[points.length - 1];
  const a = active != null ? points[active] : null;
  const dots = points.length <= 40;
  const tipLeft = a ? Math.min(Math.max(x(a.t), 70), w - 70) : 0;

  return (
    <div className="chart" ref={wrap}>
      <svg
        width={w} height={height} role="img" aria-label={`${title}. Latest ${format(last.v)} on ${last.label}.`}
        tabIndex={0} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => { if (e.pointerType !== "touch") setActive(null); }}
        onKeyDown={onKey} onBlur={() => setActive(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className="chart-grid" x1={padL} x2={padL + iw} y1={y(v)} y2={y(v)} />
            <text className="chart-tick" x={padL - 8} y={y(v)} dy="0.32em" textAnchor="end">{fmtTick(v)}</text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} className="chart-tick" x={x(points[i].t)} y={height - 8}
            textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {points[i].label}
          </text>
        ))}
        {points.length > 1 && <path className="chart-area" d={area} />}
        {points.length > 1 && <path className="chart-line" d={line} />}
        {a && <line className="chart-cross" x1={x(a.t)} x2={x(a.t)} y1={padT - 6} y2={y(0)} />}
        {points.map((p, i) => (dots || i === points.length - 1 || i === active) && (
          <circle key={i} className="chart-dot" cx={x(p.t)} cy={y(p.v)} r={i === active ? 5.5 : 4} />
        ))}
        {!a && (
          <text className="chart-end" x={x(last.t)} y={y(last.v) - 12} textAnchor={points.length === 1 ? "middle" : "end"}>{format(last.v)}</text>
        )}
      </svg>
      {a && (
        <div className="chart-tip" style={{ left: tipLeft, top: Math.max(0, y(a.v) - 58) }} role="status">
          <b>{format(a.v)}</b>
          <span>{a.label}</span>
        </div>
      )}
    </div>
  );
}
