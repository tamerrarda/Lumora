"use client";

import type { SeriesPoint } from "@/lib/analytics";

interface Props {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  unit?: string;
}

// Dependency-free, responsive SVG area chart. viewBox coordinates;
// width 100% (stretches via preserveAspectRatio none).
export function LineChart({
  data,
  color = "#6e56cf",
  height = 160,
  unit = "USDC",
}: Props) {
  const W = 600;
  const H = height;
  const pad = 8;

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-surface text-sm text-faint"
        style={{ height: H }}
      >
        Not enough data to chart (need at least 2 points).
      </div>
    );
  }

  const ts = data.map((d) => d.t);
  const vs = data.map((d) => d.v);
  const minT = Math.min(...ts);
  const maxT = Math.max(...ts);
  const maxV = Math.max(...vs, 1e-9);

  const x = (t: number) =>
    pad + ((t - minT) / (maxT - minT || 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - (v / maxV) * (H - 2 * pad);

  const line = data.map((d) => `${x(d.t)},${y(d.v)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
  const last = data[data.length - 1].v;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: H }}
      >
        <polygon points={area} fill={color} fillOpacity={0.12} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute right-2 top-1 text-right">
        <div className="font-mono text-lg font-bold tnum" style={{ color }}>
          {last.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted">{unit}</div>
      </div>
    </div>
  );
}
