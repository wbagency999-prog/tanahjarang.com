export const STOP_WORDS = new Set([
  'yang', 'di', 'dan', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'ke', 'dari',
  'ada', 'juga', 'akan', 'sudah', 'tidak', 'bisa', 'oleh', 'sebagai', 'dalam',
  'adalah', 'tersebut', 'lebih', 'karena', 'belum', 'atau', 'kini', 'then',
  'the', 'of', 'in', 'to', 'and', 'a', 'is', 'for', 'on', 'with', 'by', 'at',
  'this', 'that', 'from', 'been', 'have', 'has', 'had', 'were', 'was', 'are',
  'berita', 'terbaru', 'update', 'hari', 'ini', 'kabar', 'resmi',
]);

// Extract angka signifikan dari judul (magnitude gempa, jumlah korban, tahun, dll)
function extractNumbers(title: string): string[] {
  return title.match(/\d[\d.,]*\d|\d/g) || [];
}

export function extractSignificantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export function titleSimilarityScore(titleA: string, titleB: string): number {
  const wordsA = extractSignificantWords(titleA);
  const wordsB = extractSignificantWords(titleB);

  if (wordsA.length < 2 || wordsB.length < 2) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let matches = 0;
  for (const word of setA) {
    if (setB.has(word)) matches++;
  }

  // Word similarity (gunakan min untuk kasus judul pendek vs panjang)
  const wordScore = matches / Math.min(setA.size, setB.size);

  // Number match bonus: jika kedua judul punya angka yang sama, tambah skor
  const numsA = extractNumbers(titleA);
  const numsB = extractNumbers(titleB);
  const numMatches = numsA.filter(n => numsB.includes(n)).length;
  const numBonus = numMatches > 0 ? 0.15 : 0;

  return Math.min(wordScore + numBonus, 1.0);
}

export function isSimilarTitle(
  title: string,
  existingTitles: string[],
  threshold = 0.35
): boolean {
  return existingTitles.some(
    (existingTitle) => titleSimilarityScore(title, existingTitle) >= threshold
  );
}
