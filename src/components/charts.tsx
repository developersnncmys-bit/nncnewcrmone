"use client";
import { useState } from "react";

// Chart colours (reference data-viz palette, light surface). One series → one hue.
const SERIES = "#0b5cff"; // NNC brand blue
const GRID = "#e7e5e4";

const fmtShort = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}k` : `₹${n}`;
const fmtFull = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/**
 * Column chart for one money series (e.g. revenue per month).
 * Thin columns, 4px rounded tops on the baseline, recessive grid, hover tooltip per column.
 */
export function ColumnChart({ data, height = 220 }: { data: { label: string; value: number; sub?: string }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const padL = 48;
  const padB = 26;
  const padT = 10;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const plotH = height - padB - padT;
  const plotW = W - padL - 8;
  const slot = plotW / data.length;
  const barW = Math.min(28, slot - 6);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Revenue by month">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#78716c">
              {fmtShort(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = Math.max(0, (d.value / max) * plotH);
          const r = Math.min(4, h);
          const top = padT + plotH - h;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* hit target wider than the mark */}
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${padT + plotH} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barW - r},${top} Q${x + barW},${top} ${x + barW},${top + r} L${x + barW},${padT + plotH} Z`}
                  fill={SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <text x={padL + i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={hover === i ? "#1c1917" : "#78716c"}>
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={padL} x2={W - 8} y1={padT + plotH} y2={padT + plotH} stroke="#d6d3d1" strokeWidth={1} />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%`, top: 0 }}
        >
          <div className="font-semibold">{fmtFull(data[hover].value)}</div>
          <div className="text-slate-300">{data[hover].sub ?? data[hover].label}</div>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars with direct labels (magnitude by category; one hue). */
export function BarList({ rows, money = false }: { rows: { label: string; value: number; hint?: string }[]; money?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm" title={r.hint}>
          <div className="mb-1 flex justify-between gap-2">
            <span className="text-slate-600">{r.label}</span>
            <span className="font-medium text-slate-900 tabular-nums">{money ? fmtFull(r.value) : r.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
