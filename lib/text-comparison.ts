// ═══════════════════════════════════════════════════════════
//  TEXT COMPARISON — Bandingkan artikel original vs rewrite
//  5 metode: Jaccard, Cosine TF-IDF, BLEU, ROUGE, AI-as-Judge
//  Zero external dependencies
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const STOP_WORDS = new Set([
  'yang', 'di', 'dan', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'ke', 'dari',
  'ada', 'juga', 'akan', 'sudah', 'tidak', 'bisa', 'oleh', 'sebagai', 'dalam',
  'adalah', 'tersebut', 'lebih', 'karena', 'belum', 'atau', 'kini', 'telah',
  'ia', 'hal', 'kami', 'mereka', 'tersebut', 'antara', 'setiap', 'serta',
  'the', 'of', 'in', 'to', 'and', 'a', 'is', 'for', 'on', 'with', 'by', 'at',
  'this', 'that', 'from', 'been', 'have', 'has', 'had', 'were', 'was', 'are',
  'but', 'not', 'be', 'if', 'or', 'so', 'no', 'do', 'its', 'at', 'up',
]);

// ═══ PREPROCESSING ═══

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

function getWordFrequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  return freq;
}

// ═══ 1. JACCARD SIMILARITY ═══
// Rasio irisan kata antara dua teks
// Skor 0 (tidak sama) → 1 (identik)

export function jaccardSimilarity(original: string, rewrite: string): number {
  const wordsA = new Set(tokenize(original));
  const wordsB = new Set(tokenize(rewrite));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;

  let intersection = 0;
  for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
  const union = wordsA.size + wordsB.size - intersection;

  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

// ═══ 2. COSINE SIMILARITY (TF-IDF) ═══
// Vektor TF-IDF → cosine angle
// Skor 0 (tidak relevan) → 1 (identik)

export function cosineSimilarityTFIDF(original: string, rewrite: string): number {
  const tokensA = tokenize(original);
  const tokensB = tokenize(rewrite);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Build vocabulary
  const vocab = new Set([...tokensA, ...tokensB]);
  const freqA = getWordFrequencies(tokensA);
  const freqB = getWordFrequencies(tokensB);

  // TF: frekuensi / total tokens
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const word of vocab) {
    const tfA = (freqA.get(word) || 0) / tokensA.length;
    const tfB = (freqB.get(word) || 0) / tokensB.length;
    dotProduct += tfA * tfB;
    magA += tfA * tfA;
    magB += tfB * tfB;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude > 0 ? Math.round((dotProduct / magnitude) * 100) : 0;
}

// ═══ 3. BLEU SCORE ═══
// Seberapa banyak n-gram rewrite muncul di original (precision)
// Skor 0 (tidak ada overlap) → 100 (rewrite = subset dari original)

function getNGrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

export function bleuScore(original: string, rewrite: string): number {
  const tokensRef = tokenize(original);
  const tokensHyp = tokenize(rewrite);
  if (tokensHyp.length === 0 || tokensRef.length === 0) return 0;

  const maxN = Math.min(4, tokensHyp.length);
  let logAvg = 0;

  for (let n = 1; n <= maxN; n++) {
    const refNGrams = getNGrams(tokensRef, n);
    const hypNGrams = getNGrams(tokensHyp, n);
    if (hypNGrams.length === 0) continue;

    const refSet = new Map<string, number>();
    for (const ng of refNGrams) refSet.set(ng, (refSet.get(ng) || 0) + 1);

    let clipped = 0;
    const hypCounts = new Map<string, number>();
    for (const ng of hypNGrams) hypCounts.set(ng, (hypCounts.get(ng) || 0) + 1);

    for (const [ng, count] of hypCounts) {
      const refCount = refSet.get(ng) || 0;
      clipped += Math.min(count, refCount);
    }

    const precision = clipped / hypNGrams.length;
    logAvg += Math.log(precision + 1e-10) / maxN;
  }

  // Brevity penalty: penalize jika rewrite jauh lebih pendek
  const bp = tokensHyp.length < tokensRef.length
    ? Math.exp(1 - tokensRef.length / tokensHyp.length)
    : 1;

  return Math.round(Math.min(100, bp * Math.exp(logAvg) * 100));
}

// ═══ 4. ROUGE SCORE (ROUGE-L) ═══
// Longest Common Subsequence — recall informasi dari original
// Skor 0 (tidak ada commonality) → 100 (identik)

function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Optimize memory: only keep previous and current row
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return prev[n];
}

export function rougeScore(original: string, rewrite: string): number {
  const tokensRef = tokenize(original);
  const tokensHyp = tokenize(rewrite);
  if (tokensRef.length === 0 || tokensHyp.length === 0) return 0;

  const lcs = lcsLength(tokensRef, tokensHyp);

  // ROUGE-L recall: seberapa banyak original tertangkap
  const recall = lcs / tokensRef.length;
  // ROUGE-L precision: seberapa banyak rewrite yang relevan
  const precision = lcs / tokensHyp.length;
  // F1 score
  const f1 = (2 * recall * precision) / (recall + precision + 1e-10);

  return Math.round(f1 * 100);
}

// ═══ 5. AI-AS-JUDGE ═══
// Claude menilai perbandingan original vs rewrite

const JUDGE_PROMPT = `Anda adalah editor senior Indonesia. Nilai perbandingan artikel asli dengan artikel hasil rewrite AI.

Berikan penilaian untuk aspek berikut (skor 0-100):

1. **originalityScore** — Seberapa original tulisan baru dibanding asli? (100 = sama sekali tidak mirip, 0 = copy-paste persis)
2. **informationPreservation** — Seberapa banyak informasi penting dari artikel asli yang terjaga? (100 = semua fakta utama ada, 0 = banyak info hilang)
3. **qualityImprovement** — Apakah tulisan baru lebih baik dari asli? (100 = jauh lebih baik, 0 = lebih buruk)
4. **factualAccuracy** — Apakah rewrite tidak mengubah fakta? (100 = akurat, 0 = banyak distorsi)

Output JSON valid saja, tanpa markdown:
{
  "originalityScore": 75,
  "informationPreservation": 85,
  "qualityImprovement": 70,
  "factualAccuracy": 90,
  "summary": "Ringkasan singkat kualitas rewrite (1-2 kalimat)",
  "issues": ["Masalah 1 jika ada", "Masalah 2 jika ada"]
}`;

export interface AIJudgeResult {
  originalityScore: number;
  informationPreservation: number;
  qualityImprovement: number;
  factualAccuracy: number;
  summary: string;
  issues: string[];
}

export async function aiJudgeComparison(
  original: string,
  rewrite: string,
  sourceName: string
): Promise<AIJudgeResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    timeout: 60000,
  });

  const prompt = `${JUDGE_PROMPT}

═══ ARTIKEL ASLI (${sourceName}) ═══
${original.substring(0, 3000)}

═══ ARTIKEL REWRITE ═══
${rewrite.substring(0, 3000)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) {
      return { originalityScore: 50, informationPreservation: 50, qualityImprovement: 50, factualAccuracy: 50, summary: 'Gagal parse', issues: ['Parse error'] };
    }
    const jsonStr = text.slice(start, end + 1);
    return JSON.parse(jsonStr);
  } catch {
    return { originalityScore: 50, informationPreservation: 50, qualityImprovement: 50, factualAccuracy: 50, summary: 'AI judge error', issues: ['API error'] };
  }
}

// ═══ MAIN: RUN ALL COMPARISONS ═══

export interface ComparisonResult {
  jaccard: number;
  cosine: number;
  bleu: number;
  rouge: number;
  aiJudge: AIJudgeResult;
}

export async function compareArticles(
  originalContent: string,
  rewrittenBody: string,
  sourceName: string
): Promise<ComparisonResult> {
  // 4 metode statistik (instant)
  const jaccard = jaccardSimilarity(originalContent, rewrittenBody);
  const cosine = cosineSimilarityTFIDF(originalContent, rewrittenBody);
  const bleu = bleuScore(originalContent, rewrittenBody);
  const rouge = rougeScore(originalContent, rewrittenBody);

  // AI-as-Judge (perlu API call)
  const aiJudge = await aiJudgeComparison(originalContent, rewrittenBody, sourceName);

  return { jaccard, cosine, bleu, rouge, aiJudge };
}
