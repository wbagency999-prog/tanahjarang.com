/**
 * Menghitung estimasi waktu baca artikel (dalam menit).
 * Rata-rata orang membaca 200 kata per menit (Bahasa Indonesia).
 */
export function estimasiBaca(body: any): number {
  if (!Array.isArray(body)) return 1;

  let totalKata = 0;
  for (const block of body) {
    if (block._type === "block" && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (child.text) {
          totalKata += child.text.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }

  const menit = Math.ceil(totalKata / 200);
  return menit < 1 ? 1 : menit;
}
