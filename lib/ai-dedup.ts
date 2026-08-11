// ═══════════════════════════════════════════════════════════
//  AI DEDUP — Deduplikasi semantic pakai Claude Haiku
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  timeout: 30000,
});

const DEDUP_PROMPT = `Anda adalah editor berita Indonesia. Tugas Anda: identifikasi artikel yang benar-benar DUPLIKAT.

═══ ATURAN PENTING ═══
Berita turunan/perkembangan BUKAN duplikat. SIMPAN semua berita perkembangan.

Ciri DUPLIKAT MURNI (SKIP):
- Informasi SAMA persis, hanya kata-kata/judul berbeda
- Tidak ada data baru yang signifikan
- Contoh: "Gempa Kolombia M 7,4 Guncang" vs "Gempa Dahsyat Magnitudo 7,4 Guncang Kolombia" → SKIP salah satu

Ciri BERITA TURUNAN (SIMPAN):
- Ada ANGKA BARU (kematian bertambah, jumlah korban berubah, harga berubah)
- Ada UPDATE STATUS (situasi memburuk, sudah ditangani, ada kebijakan baru)
- Ada sudut pandang BERBEDA (dari sisi berbeda, interviews berbeda)
- Contoh: "Gempa M 7,4 Guncang Kolombia" → "Korban Gempa Kolombia Bertambah Jadi 132" → SIMPAN keduanya

═══ DATA ═══

Judul Baru (dari berbagai sumber berita):
{newTitles}

Judul yang Sudah Ada di Database:
{existingTitles}

Tugas: Hanya SKIP judul baru yang merupakan DUPLIKAT MURNI (informasi sama, kata beda).
Jika ragu, SIMPAN (jangan skip).

Return HANYA JSON array of indices (0-based) dari judul baru yang DUPLIKAT MURNI.
Contoh: [0, 1] artinya judul baru #0 dan #1 adalah duplikat murni.
Jika tidak ada duplikat murni, return [].`;

export interface DedupResult {
  duplicateIndices: number[];
  totalChecked: number;
  totalDuplicates: number;
}

export async function aiDeduplicate(
  newTitles: string[],
  existingTitles: string[]
): Promise<DedupResult> {
  if (newTitles.length === 0 || existingTitles.length === 0) {
    return { duplicateIndices: [], totalChecked: newTitles.length, totalDuplicates: 0 };
  }

  // Format judul dengan numbering
  const formattedNew = newTitles
    .map((title, i) => `${i}. "${title}"`)
    .join('\n');

  const formattedExisting = existingTitles
    .map((title, i) => `${i + 1}. "${title}"`)
    .join('\n');

  const prompt = DEDUP_PROMPT
    .replace('{newTitles}', formattedNew)
    .replace('{existingTitles}', formattedExisting);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\d\s,]*\]/);
    if (!jsonMatch) {
      console.log('AI dedup: no JSON array found in response');
      return { duplicateIndices: [], totalChecked: newTitles.length, totalDuplicates: 0 };
    }

    const indices: number[] = JSON.parse(jsonMatch[0]);
    const validIndices = indices.filter(i => i >= 0 && i < newTitles.length);

    return {
      duplicateIndices: validIndices,
      totalChecked: newTitles.length,
      totalDuplicates: validIndices.length,
    };
  } catch (error: any) {
    console.error('AI dedup error:', error.message);
    // Fallback: don't skip anything if AI fails
    return { duplicateIndices: [], totalChecked: newTitles.length, totalDuplicates: 0 };
  }
}
