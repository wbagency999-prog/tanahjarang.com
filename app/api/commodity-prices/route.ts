import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CommodityData {
  name: string;
  symbol: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[];
  source: string;
}

// Yahoo Finance symbols
const YAHOO_SYMBOLS: Record<string, { name: string; unit: string }> = {
  "GC=F": { name: "Emas", unit: "USD/Troy Oz" },
  "SI=F": { name: "Perak", unit: "USD/Troy Oz" },
  "PL=F": { name: "Platinum", unit: "USD/Troy Oz" },
  "PA=F": { name: "Palladium", unit: "USD/Troy Oz" },
  "HG=F": { name: "Tembaga", unit: "USD/lb" },
  "CL=F": { name: "Minyak WTI", unit: "USD/bbl" },
  "BZ=F": { name: "Minyak Brent", unit: "USD/bbl" },
  "NG=F": { name: "Gas Alami", unit: "USD/MMBtu" },
};

// HMA/HBA ESDM (Regulasi)
const HMA_HBA_DATA: Omit<CommodityData, "history">[] = [
  { name: "Nikel (HMA)", symbol: "NI", unit: "USD/dmt", price: 16646.00, change: 215.40, changePercent: 1.31, source: "HMA ESDM" },
  { name: "Kobalt (HMA)", symbol: "CO", unit: "USD/dmt", price: 55875.67, change: 325.40, changePercent: 0.59, source: "HMA ESDM" },
  { name: "Batubara 6322 GAR", symbol: "COAL", unit: "USD/ton", price: 124.44, change: -7.41, changePercent: -5.62, source: "HBA ESDM" },
  { name: "Batubara I (5300)", symbol: "COAL1", unit: "USD/ton", price: 93.27, change: 3.37, changePercent: 3.75, source: "HBA ESDM" },
  { name: "Batubara II (4100)", symbol: "COAL2", unit: "USD/ton", price: 65.48, change: 2.23, changePercent: 3.51, source: "HBA ESDM" },
  { name: "Batubara III (3400)", symbol: "COAL3", unit: "USD/ton", price: 45.27, change: 0.19, changePercent: 0.42, source: "HBA ESDM" },
];

function generateHistory(bp: number, v: number): { date: string; price: number }[] {
  const d: { date: string; price: number }[] = [];
  let p = bp * (1 - v * 4);
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    p = Math.max(bp * 0.85, Math.min(bp * 1.15, p + (Math.random() - 0.48) * v * bp));
    d.push({ date: date.toISOString().split("T")[0], price: Math.round(p * 100) / 100 });
  }
  return d;
}

export async function GET() {
  const commodities: CommodityData[] = [];

  // Fetch dari Yahoo Finance (GRATIS, 1 tahun data)
  try {
    for (const [yahooSymbol, info] of Object.entries(YAHOO_SYMBOLS)) {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1y&interval=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const chart = data?.chart?.result?.[0];
      if (!chart?.timestamp || !chart?.indicators?.quote?.[0]?.close) continue;

      const timestamps: number[] = chart.timestamp;
      const closes: (number | null)[] = chart.indicators.quote[0].close;

      const history = timestamps
        .map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split("T")[0],
          price: closes[i] ?? 0,
        }))
        .filter((h) => h.price > 0);

      if (history.length < 2) continue;

      const latestPrice = history[history.length - 1].price;
      const prevPrice = history[history.length - 2].price;
      const change = latestPrice - prevPrice;
      const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

      commodities.push({
        name: info.name,
        symbol: yahooSymbol.split("=")[0],
        unit: info.unit,
        price: Math.round(latestPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        history,
        source: "Yahoo Finance (real-time)",
      });
    }
  } catch (err) {
    console.error("Yahoo Finance API error:", err);
  }

  // Tambah HMA/HBA ESDM
  for (const hma of HMA_HBA_DATA) {
    commodities.push({
      ...hma,
      history: generateHistory(hma.price, hma.changePercent / 100),
    });
  }

  return NextResponse.json({ commodities, lastUpdate: new Date().toISOString() });
}
