/**
 * Menghitung waktu relatif dari tanggal yang diberikan (relative time).
 * Contoh: "Baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu"
 */
export function waktuLalu(tanggal: string): string {
  const detik = Math.floor((Date.now() - new Date(tanggal).getTime()) / 1000);
  if (detik < 60) return "Baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}
