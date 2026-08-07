import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "AUD", "JPY", "MYR", "CNY"];

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  SGD: "Singapore Dollar",
  AUD: "Australian Dollar",
  JPY: "Japanese Yen",
  MYR: "Malaysian Ringgit",
  CNY: "Chinese Yuan",
};

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/IDR");
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const rates = CURRENCIES.map((code) => ({
          code,
          name: CURRENCY_NAMES[code],
          rate: Math.round(1 / data.rates[code]), // Convert to IDR per 1 unit
        }));
        return NextResponse.json({
          rates,
          lastUpdate: data.time_last_update_utc,
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch currency rates:", err);
  }

  // Fallback rates
  return NextResponse.json({
    rates: CURRENCIES.map((code) => ({
      code,
      name: CURRENCY_NAMES[code],
      rate: 0,
    })),
    lastUpdate: new Date().toISOString(),
  });
}
