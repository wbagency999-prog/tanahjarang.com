"use client";

import { useState, useEffect, useRef } from "react";
import CurrencyTicker from "./CurrencyTicker";

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  prevRate?: number;
}

export default function CurrencyRatesFetcher() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const prevRatesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch("/api/currency-rates");
        if (res.ok) {
          const data = await res.json();
          if (data.rates && data.rates.length > 0) {
            const newRates = data.rates.map((r: { code: string; name: string; rate: number }) => ({
              ...r,
              prevRate: prevRatesRef.current[r.code],
            }));
            // Store current rates as previous for next fetch
            data.rates.forEach((r: { code: string; rate: number }) => {
              prevRatesRef.current[r.code] = r.rate;
            });
            setRates(newRates);
          }
        }
      } catch {
        // Use empty rates
      }
    }
    fetchRates();

    // Refresh setiap 60 detik
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  return <CurrencyTicker rates={rates} />;
}
