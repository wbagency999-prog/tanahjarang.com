"use client";

import { useState, useEffect, useMemo } from "react";
import Breadcrumb from "../components/Breadcrumb";
import CommodityChart from "../components/CommodityChart";

interface CommodityData {
  name: string;
  symbol: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[];
  source?: string;
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatIdr(n: number): string {
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function KomoditasPage() {
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [usdToIdr, setUsdToIdr] = useState(16015); // default
  const [selected, setSelected] = useState<string>("");
  const [period, setPeriod] = useState<"1W" | "1M" | "3M" | "1Y">("1M");
  const [sortField, setSortField] = useState<"name" | "price" | "change">("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [comRes, curRes] = await Promise.all([
          fetch("/api/commodity-prices"),
          fetch("/api/currency-rates"),
        ]);
        if (comRes.ok) {
          const data = await comRes.json();
          setCommodities(data.commodities || []);
          if (!selected && data.commodities?.length > 0) {
            setSelected(data.commodities[0].symbol);
          }
        }
        if (curRes.ok) {
          const curData = await curRes.json();
          const usdRate = curData.rates?.find((r: { code: string }) => r.code === "USD");
          if (usdRate) setUsdToIdr(usdRate.rate);
        }
        setLastUpdate(new Date());
      } catch { /* use defaults */ }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedCommodity = commodities.find((c) => c.symbol === selected);

  const periodDays = period === "1W" ? 7 : period === "1M" ? 30 : period === "3M" ? 90 : 365;
  const chartData = useMemo(() => {
    if (!selectedCommodity) return [];
    const hist = selectedCommodity.history.slice(-periodDays);
    // Pastikan titik terakhir = harga saat ini
    if (hist.length > 0 && hist[hist.length - 1].price !== selectedCommodity.price) {
      const lastDate = new Date().toISOString().split("T")[0];
      hist.push({ date: lastDate, price: selectedCommodity.price });
    }
    return hist;
  }, [selectedCommodity, periodDays]);

  const sortedCommodities = useMemo(() => {
    const sorted = [...commodities].sort((a, b) => {
      if (sortField === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortField === "price") return sortDir === "asc" ? a.price - b.price : b.price - a.price;
      return sortDir === "asc" ? a.changePercent - b.changePercent : b.changePercent - a.changePercent;
    });
    const filtered = filter
      ? sorted.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()) || c.symbol.toLowerCase().includes(filter.toLowerCase()))
      : sorted;
    return filtered;
  }, [commodities, sortField, sortDir, filter]);

  function toggleSort(field: "name" | "price" | "change") {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Breadcrumb items={[{ name: "Home", href: "/" }, { name: "Komoditas" }]} />
          <h1 className="mt-3 text-3xl font-black">Komoditas</h1>
          <p className="mt-1 text-[#1A1815]/60">
            Harga komoditas global · {lastUpdate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, {lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
            {usdToIdr > 0 && <span className="ml-2">· 1 USD = Rp {usdToIdr.toLocaleString("id-ID")}</span>}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Chart Section */}
        {selectedCommodity && (
          <div className="rounded-xl border border-black/10 bg-gradient-to-br from-slate-50 to-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedCommodity.name}</h2>
                <p className="text-xs text-[#1A1815]/50">{selectedCommodity.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black tabular-nums">${formatPrice(selectedCommodity.price)}</p>
                {usdToIdr > 0 && (
                  <p className="text-sm text-[#1A1815]/50">≈ Rp {formatIdr(selectedCommodity.price * usdToIdr)}</p>
                )}
                <p className={`text-xs font-semibold ${selectedCommodity.change >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {selectedCommodity.change >= 0 ? "▲" : "▼"} {selectedCommodity.change >= 0 ? "+" : ""}{selectedCommodity.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Period selector */}
            <div className="flex gap-2 mb-4">
              {(["1W", "1M", "3M", "1Y"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    period === p
                      ? "bg-[#CC181F] text-white"
                      : "bg-black/5 text-[#1A1815]/60 hover:bg-black/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <CommodityChart data={chartData} height={220} />

            {/* Quick stats */}
            {chartData.length > 0 && (() => {
              const low = Math.min(...chartData.map((d) => d.price));
              const high = Math.max(...chartData.map((d) => d.price));
              const current = selectedCommodity.price;
              const isAtLow = current <= low * 1.01;
              const isAtHigh = current >= high * 0.99;
              return (
                <div className="mt-4 grid grid-cols-3 gap-4 text-center text-xs">
                  <div className={`rounded-lg p-2 border ${isAtLow ? "border-green-300 bg-green-50" : "bg-black/[.03]"}`}>
                    <p className={`font-medium ${isAtLow ? "text-green-600" : "text-[#1A1815]/50"}`}>
                      {isAtLow ? "⬇ Near Low" : "Low"}
                    </p>
                    <p className={`font-bold ${isAtLow ? "text-green-700" : ""}`}>${formatPrice(low)}</p>
                  </div>
                  <div className={`rounded-lg p-2 border ${current >= low && current <= high ? "border-[#CC181F]/30 bg-[#CC181F]/[.05]" : "bg-black/[.03]"}`}>
                    <p className="text-[#1A1815]/50 font-medium">Current</p>
                    <p className="font-bold text-[#CC181F]">${formatPrice(current)}</p>
                    <p className="text-[10px] text-[#1A1815]/40">
                      {current >= low && current <= high ? "Within range" : "Out of range"}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2 border ${isAtHigh ? "border-green-300 bg-green-50" : "bg-black/[.03]"}`}>
                    <p className={`font-medium ${isAtHigh ? "text-green-600" : "text-[#1A1815]/50"}`}>
                      {isAtHigh ? "⬆ Near High" : "High"}
                    </p>
                    <p className={`font-bold ${isAtHigh ? "text-green-700" : ""}`}>${formatPrice(high)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Commodities Table */}
        <div className="mt-6 rounded-xl border border-black/10 bg-gradient-to-br from-slate-50 to-white">
          <div className="border-b border-black/5 px-5 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wide">Daftar Harga Komoditas</h3>
          </div>
          {/* Search + Filter */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari komoditas..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 rounded-lg border border-black/10 px-4 py-2 text-sm focus:border-[#CC181F] focus:outline-none"
          />
          {filter && (
            <button onClick={() => setFilter("")} className="rounded-lg border border-black/10 px-3 py-2 text-xs text-[#1A1815]/60 hover:bg-black/5">
              ✕ Reset
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th onClick={() => toggleSort("name")} className="px-4 py-2.5 text-left font-semibold cursor-pointer hover:text-[#CC181F]">
                    Komoditas {sortField === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell">Satuan</th>
                  <th onClick={() => toggleSort("price")} className="px-4 py-2.5 text-right font-semibold cursor-pointer hover:text-[#CC181F]">
                    Harga (USD) {sortField === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  {usdToIdr > 0 && (
                    <th className="px-4 py-2.5 text-right font-semibold hidden md:table-cell">Harga (IDR)</th>
                  )}
                  <th onClick={() => toggleSort("change")} className="px-4 py-2.5 text-right font-semibold cursor-pointer hover:text-[#CC181F]">
                    Perubahan {sortField === "change" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCommodities.map((c, i) => (
                  <tr
                    key={c.symbol}
                    onClick={() => setSelected(c.symbol)}
                    className={`cursor-pointer transition-colors ${
                      c.symbol === selected ? "bg-[#CC181F]/[.05] border-l-2 border-[#CC181F]" : "hover:bg-black/[.02] border-l-2 border-transparent"
                    } ${i % 2 === 0 ? "" : "bg-black/[.01]"}`}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      <span className="font-bold text-[#1A1815]/40 text-xs mr-2">{c.symbol}</span>
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5 text-[#1A1815]/50 hidden sm:table-cell">{c.unit}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">${formatPrice(c.price)}</td>
                    {usdToIdr > 0 && (
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#1A1815]/50 hidden md:table-cell">
                        Rp {formatIdr(c.price * usdToIdr)}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                        c.change >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                      }`}>
                        {c.change >= 0 ? "▲" : "▼"} {c.change >= 0 ? "+" : ""}{c.changePercent.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#1A1815]/30">
          Data komoditas dari open.er-api.com · Harga dapat berubah sewaktu-waktu · Bukan saran investasi
        </p>
      </main>
    </div>
  );
}
