"use client";

import { useEffect, useRef } from "react";

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  prevRate?: number;
}

interface CurrencyTickerProps {
  rates: CurrencyRate[];
}

export default function CurrencyTicker({ rates }: CurrencyTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || rates.length === 0) return;

    let animationId: number;
    let speed = 0.6;

    function animate() {
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += speed;
      }
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    const handleMouseEnter = () => { speed = 0; };
    const handleMouseLeave = () => { speed = 0.6; };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [rates]);

  if (rates.length === 0) return null;

  function formatRate(rate: number): string {
    if (rate >= 10000) {
      return rate.toLocaleString("id-ID");
    }
    return rate.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="ticker-glow border-b border-black/5 bg-gradient-to-r from-[#1A1815]/[.03] via-[#1A1815]/[.01] to-[#1A1815]/[.03]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        {/* Label Kurs */}
        <span className="shrink-0 rounded bg-[#1A181F] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Kurs
        </span>

        {/* Scrollable Ticker */}
        <div
          ref={scrollRef}
          className="overflow-hidden flex-1"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-5 whitespace-nowrap">
            {rates.map((item) => {
              const change = item.prevRate
                ? ((item.rate - item.prevRate) / item.prevRate) * 100
                : 0;
              const isUp = change >= 0;
              const hasData = item.rate > 0;

              return (
                <span key={item.code} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-[#1A1815]/90">{item.code}</span>
                  <span className="tabular-nums font-semibold text-[#1A1815]/70">
                    {hasData ? `Rp ${formatRate(item.rate)}` : "—"}
                  </span>
                  {hasData && change !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold ${
                      isUp
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      <span className="text-[8px]">{isUp ? "▲" : "▼"}</span>
                      {Math.abs(change).toFixed(2)}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
