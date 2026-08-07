import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MineralPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

// Default prices (akan diupdate dari API eksternal jika tersedia)
const DEFAULT_PRICES: MineralPrice[] = [
  { symbol: "XAU", name: "Gold", price: 2345.20, change: 28.50, changePercent: 1.23, unit: "USD/oz" },
  { symbol: "XAG", name: "Silver", price: 28.50, change: 0.22, changePercent: 0.78, unit: "USD/oz" },
  { symbol: "HG", name: "Copper", price: 4.12, change: -0.012, changePercent: -0.29, unit: "USD/lb" },
  { symbol: "NI", name: "Nickel", price: 18200, change: 380, changePercent: 2.13, unit: "USD/t" },
  { symbol: "SN", name: "Tin", price: 32100, change: 160, changePercent: 0.50, unit: "USD/t" },
  { symbol: "ZS", name: "Zinc", price: 2890, change: -5.78, changePercent: -0.20, unit: "USD/t" },
];

export async function GET() {
  // TODO: Integrasi dengan MetalpriceAPI atau sumber data lain
  // Saat ini menggunakan default prices
  // Untuk mengaktifkan API, uncomment kode di bawah:
  //
  // try {
  //   const res = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=YOUR_KEY&base=USD&currencies=XAU,XAG,HG,NI,SN,ZS`);
  //   if (res.ok) {
  //     const data = await res.json();
  //     // Parse data dan return
  //   }
  // } catch (err) {
  //   console.error('Failed to fetch mineral prices:', err);
  // }

  return NextResponse.json({
    prices: DEFAULT_PRICES,
    lastUpdate: new Date().toISOString(),
  });
}
