// ═══════════════════════════════════════════════════════════
//  AI REWRITER — Rewrite artikel menggunakan Claude API
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  timeout: 90000, // 90 second timeout
});

export interface RewriteResult {
  title: string;
  subtitle: string;
  body: string;
  excerpt: string;
  tags: string[];
  metaDescription: string;
  seoTitle: string;
  focusKeyphrase: string;
  ogDescription: string;
  mainImageAlt: string;
  imageCaption: string;
  category: string;
  analysis: {
    factCheckScore: number;
    ethicsScore: number;
    originalityScore: number;
    plagiarismScore: number;
    sourceAttributions: { sourceName: string; sourceUrl: string }[];
    verifiedFacts: { claim: string; confidence: string; supportingSources: string[] }[];
  };
}

const REWRITE_PROMPT = `Anda adalah jurnalis profesional Indonesia. Tulis ulang artikel berita dari sumber di bawah dengan menerapkan kaidah jurnalistik profesional.

═══ BERSIHKAN DULU SEBELUM MENULIS ═══
Sebelum menulis ulang, HAPUS semua elemen ini dari konten sumber:
- "Baca juga: ..." (link internal)
- "Copyright ... All Rights Reserved"
- Header sumber: "KOTA, NAMA MEDIA.com -" di awal artikel
- Iklan atau promosi yang menyusup di tengah artikel
- Penanda editorial: "Baca juga", "Simak juga", "Lihat juga", "Artikel terkait"

═══ KEPAATUHAN HUKUM & ETIKA ═══
- Verifikasi berlapis: Jangan mengarang fakta. Setiap klaim harus bersumber dari data sumber.
- Asas praduga tak bersalah: Jangan menghakimi subjek berita. Gunakan frasa seperti "diduga", "menurut jaksa", "dalam dakwaan", bukan "telah bersalah".
- Perlindungan anak: Samarkan identitas korban/penyandang di bawah umur (inisial saja).
- Independensi: Tulis netral, tanpa opini pribadi atau bias pemilik media.

═══ TEKNIK PENYAJIAN TEKS ═══
- Atribusi jelas: Setiap kutipan atau klaim wajib menyebutkan nama lengkap dan jabatan sumber. Contoh: "Kapolri Jenderal Listyo Sigit Prabowo mengatakan..."
- Kata kerja aktif: Gunakan aktif sebisa mungkin. Contoh: "Polisi mengungkap kasus" bukan "Kasus diungkap polisi".
- Satu ide per paragraf: Setiap paragraf hanya membahas satu ide pokok.
- Transisi logis: Paragraf harus mengalir lancar satu sama lain.
- Panjang paragraf: Maksimal 4-5 kalimat per paragraf.

═══ STRUKTUR ARTIKEL ═══
- 400-600 kata, 5-6 paragraf
- Paragraf 1: Lead — ringkas fakta utama (5W+1H)
- Paragraf 2-4: Isi — detail, kutipan sumber, konteks
- Paragraf 5: Dampak atau analisis singkat
- Paragraf 6: Penutup — langkah selanjutnya atau rencana terkait
- Bahasa Indonesia baku, lugas, tanpa clickbait

═══ VISUAL & CAPTION ═══
- imageCaption harus menjelaskan gambar dengan rumus 5W+1H singkat (apa, siapa, kapan, di mana)
- mainImageAlt harus deskriptif dan informatif untuk aksesibilitas

═══ OUTPUT JSON ═══
{
  "title": "Judul informatif, bukan clickbait",
  "subtitle": "Ringkasan maks 120 karakter",
  "body": "Isi artikel bersih tanpa link/copyright/source branding. Pisahkan paragraf dengan \\n\\n",
  "excerpt": "Ringkasan maks 160 karakter",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "metaDescription": "SEO deskripsi maks 160 karakter",
  "seoTitle": "Judul SEO maks 60 karakter",
  "focusKeyphrase": "kata kunci 2-4 kata",
  "ogDescription": "Social media deskripsi maks 200 karakter",
  "mainImageAlt": "Deskripsi gambar maks 125 karakter",
  "imageCaption": "Keterangan gambar 5W+1H singkat, maks 150 karakter",
  "category": "Kategori",
  "analysis": {
    "factCheckScore": 85,
    "ethicsScore": 90,
    "originalityScore": 88,
    "plagiarismScore": 12,
    "sourceAttributions": [{"sourceName": "Nama Media", "sourceUrl": ""}],
    "verifiedFacts": [{"claim": "Fakta", "confidence": "high", "supportingSources": ["Sumber"]}]
  }
}

Output JSON valid saja, tanpa markdown.`;

// Robust JSON extraction — cari blok { ... } terluar dari response
function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.replace(/```json\n?|\n?```/g, '').trim();
}

export async function rewriteArticle(
  originalTitle: string,
  originalContent: string,
  sourceName: string,
  category: string
): Promise<RewriteResult> {
  const userMessage = `Sumber: ${sourceName}
Kategori asli: ${category}

Judul asli:
${originalTitle}

Isi artikel:
${originalContent}`;

  try {
    // Attempt 1: normal rewrite
    let response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6144,
      messages: [
        { role: 'user', content: REWRITE_PROMPT + '\n\n' + userMessage },
      ],
    });

    let resultText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Attempt 2: retry if JSON parse fails (clean retry, tanpa response gagal)
    try {
      const jsonStr = extractJSON(resultText);
      const result: RewriteResult = JSON.parse(jsonStr);
      return result;
    } catch {
      console.log('AI rewrite: first attempt parse failed, retrying...');
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6144,
        messages: [
          { role: 'user', content: REWRITE_PROMPT + '\n\n' + userMessage + '\n\nPENTING: Output HANYA JSON valid. Jangan tambahkan teks apapun sebelum atau sesudah JSON. Mulai dengan { dan akhirkan dengan }.' },
        ],
      });

      resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonStr = extractJSON(resultText);
      const result: RewriteResult = JSON.parse(jsonStr);
      return result;
    }
  } catch (error: any) {
    console.error('Rewrite error:', error.message);
    throw error;
  }
}

export async function generateTags(title: string, content: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Generate 5-7 tags untuk artikel berita ini dalam bahasa Indonesia. Output hanya tag dipisahkan koma.

Judul: ${title}
Konten: ${content.substring(0, 500)}...`,
        },
      ],
    });

    const content_block = response.content[0];
    if (content_block.type !== 'text') return [];

    return content_block.text.split(',').map((t) => t.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
