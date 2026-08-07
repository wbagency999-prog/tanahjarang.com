"use client";

import { useState, useEffect } from "react";

interface MineralPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

const DEFAULT_PRICES: MineralPrice[] = [
  { symbol: "XAU", name: "Gold", price: 2345.20, change: 28.50, changePercent: 1.23, unit: "USD/oz" },
  { symbol: "XAG", name: "Silver", price: 28.50, change: 0.22, changePercent: 0.78, unit: "USD/oz" },
  { symbol: "HG", name: "Copper", price: 4.12, change: -0.012, changePercent: -0.29, unit: "USD/lb" },
  { symbol: "NI", name: "Nickel", price: 18200, change: 380, changePercent: 2.13, unit: "USD/t" },
  { symbol: "SN", name: "Tin", price: 32100, change: 160, changePercent: 0.50, unit: "USD/t" },
  { symbol: "ZS", name: "Zinc", price: 2890, change: -5.78, changePercent: -0.20, unit: "USD/t" },
  { symbol: "HBA", name: "Coal HBA", price: 124.44, change: -7.41, changePercent: -5.62, unit: "USD/t" },
  { symbol: "HBA-I", name: "Coal HBA-I", price: 93.27, change: 3.37, changePercent: 3.75, unit: "USD/t" },
];

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIdr(price: number): string {
  return price.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function MineralPriceWidget() {
  const [prices, setPrices] = useState<MineralPrice[]>(DEFAULT_PRICES);
  const [usdToIdr, setUsdToIdr] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch mineral prices
        const priceRes = await fetch("/api/mineral-prices");
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (priceData.prices && priceData.prices.length > 0) {
            setPrices(priceData.prices);
          }
        }

        // Fetch USD/IDR rate
        const currRes = await fetch("/api/currency-rates");
        if (currRes.ok) {
          const currData = await currRes.json();
          const usdRate = currData.rates?.find((r: { code: string }) => r.code === "USD");
          if (usdRate) {
            setUsdToIdr(usdRate.rate);
          }
        }
        setLastUpdate(new Date());
      } catch {
        // Use defaults
      }
    }
    fetchData();
  }, []);

  return (
    <div className="rounded-xl border border-black/5 bg-gradient-to-br from-slate-50 to-white p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-black/5 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1815]">
          Harga Mineral
        </h3>
        <span className="text-[10px] text-[#1A1815]/40">
          {lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
        </span>
      </div>

      {/* Price List */}
      <div className="space-y-0">
        {prices.map((item, i) => {
          const isUp = item.change >= 0;
          const idrPrice = usdToIdr > 0 ? item.price * usdToIdr : null;

          return (
            <div key={item.symbol}>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1815]">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-[#1A1815]/40">{item.unit}</p>
                </div>

                <div className="text-right">
                  {/* USD Price */}
                  <p className="text-sm font-bold tabular-nums text-[#1A1815]">
                    ${formatPrice(item.price)}
                  </p>
                  {/* IDR Price */}
                  {idrPrice && (
                    <p className="text-[10px] tabular-nums text-[#1A1815]/50">
                      ≈ Rp {formatIdr(idrPrice)}
                    </p>
                  )}
                  {/* Change */}
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
                    <span>{isUp ? "▲" : "▼"}</span>
                    <span>{isUp ? "+" : ""}{item.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              {i < prices.length - 1 && (
                <div className="border-b border-black/[.03]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-black/5 pt-3 text-center">
        <p className="text-[9px] text-[#1A1815]/30">
          {usdToIdr > 0 ? `1 USD = Rp ${formatIdr(usdToIdr)}` : "Memuat kurs..."} · Bukan saran investasi
        </p>
      </div>
    </div>
  );
}
