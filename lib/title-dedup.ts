export const STOP_WORDS = new Set([
  'yang', 'di', 'dan', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'ke', 'dari',
  'ada', 'juga', 'akan', 'sudah', 'tidak', 'bisa', 'oleh', 'sebagai', 'dalam',
  'adalah', 'tersebut', 'lebih', 'karena', 'belum', 'atau', 'kini', 'then',
  'the', 'of', 'in', 'to', 'and', 'a', 'is', 'for', 'on', 'with', 'by', 'at',
]);

export function extractSignificantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

export function titleSimilarityScore(titleA: string, titleB: string): number {
  const wordsA = extractSignificantWords(titleA);
  const wordsB = extractSignificantWords(titleB);

  if (wordsA.length < 3 || wordsB.length < 3) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let matches = 0;
  for (const word of setA) {
    if (setB.has(word)) matches++;
  }

  return matches / Math.max(setA.size, setB.size);
}

export function isSimilarTitle(
  title: string,
  existingTitles: string[],
  threshold = 0.6
): boolean {
  return existingTitles.some(
    (existingTitle) => titleSimilarityScore(title, existingTitle) >= threshold
  );
}
