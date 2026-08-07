"use client";

import { useState } from "react";

interface PricePoint {
  date: string;
  price: number;
}

interface CommodityChartProps {
  data: PricePoint[];
  color?: string;
  height?: number;
}

// Generate smooth cubic bezier path
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || curr;
    const afterNext = points[i + 2] || next;

    // Control points for cubic bezier
    const cp1x = curr.x + (next.x - prev.x) / 6;
    const cp1y = curr.y + (next.y - prev.y) / 6;
    const cp2x = next.x - (afterNext.x - curr.x) / 6;
    const cp2y = next.y - (afterNext.y - curr.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  return path;
}

export default function CommodityChart({ data, color = "#CC181F", height = 200 }: CommodityChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; price: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-[#1A1815]/40" style={{ height }}>
        Memuat data grafik...
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices) * 0.99;
  const max = Math.max(...prices) * 1.01;
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * 100,
    y: ((max - d.price) / range) * 100,
    date: d.date,
    price: d.price,
  }));

  const smoothPathD = smoothPath(points);

  // X-axis labels (show 5 evenly spaced)
  const xLabels: string[] = [];
  const labelCount = Math.min(data.length, 5);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
    const dateStr = data[idx]?.date || "";
    const parts = dateStr.split("-");
    const label = parts.length === 3 ? `${parts[2]} ${monthNames[parseInt(parts[1]) - 1] || ""}` : dateStr;
    xLabels.push(label);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    let closest = points[0];
    let minDist = Math.abs(points[0].x - xPercent);
    for (const p of points) {
      const dist = Math.abs(p.x - xPercent);
      if (dist < minDist) { minDist = dist; closest = p; }
    }
    setTooltip({
      x: (closest.x / 100) * rect.width,
      y: ((max - closest.price) / range) * rect.height,
      date: closest.date,
      price: closest.price,
    });
  }

  return (
    <div className="relative w-full" style={{ height: height + 25 }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex flex-col justify-between text-[10px] text-[#1A1815]/40" style={{ height }}>
        <span>{max.toFixed(2)}</span>
        <span>{((max + min) / 2).toFixed(2)}</span>
        <span>{min.toFixed(2)}</span>
      </div>

      {/* Chart area */}
      <div className="ml-8">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full cursor-crosshair"
          style={{ height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.3" />
          ))}

          {/* Gradient fill under line */}
          <defs>
            <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d={`${smoothPath(points)} L 100,100 L 0,100 Z`}
            fill={`url(#gradient-${color.replace("#", "")})`}
          />

          {/* Smooth line */}
          <path
            d={smoothPath(points)}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 8)) === 0 || i === points.length - 1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="0.8" fill={color} opacity="0.5" />
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-[10px] text-[#1A1815]/40 mt-1">
          {xLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 rounded-lg border border-black/10 bg-white px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: tooltip.x + 32, top: tooltip.y - 40, transform: "translateX(-50%)" }}
        >
          <p className="text-[10px] font-bold">${tooltip.price.toFixed(2)}</p>
          <p className="text-[8px] text-[#1A1815]/50">{tooltip.date}</p>
        </div>
      )}
    </div>
  );
}
