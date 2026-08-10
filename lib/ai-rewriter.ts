// ═══════════════════════════════════════════════════════════
//  AI REWRITER — Rewrite artikel menggunakan Claude API
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
});

export interface RewriteResult {
  title: string;
  subtitle: string;
  body: string;
  excerpt: string;
  tags: string[];
  metaDescription: string;
  seoTitle: string;
  category: string;
}

const REWRITE_PROMPT = `Anda adalah jurnalis profesional Indonesia yang bekerja untuk portal berita "Warta Nusantara" (tanahjarang.com). Gaya penulisan Anda formal, akurat, dan mudah dipahami pembaca umum.

TUGAS: Buat artikel berita baru berdasarkan informasi sumber di bawah. Artikel harus 100% original, bukan copy-paste.

PENTING: Artikel harus LENGKAP dan PANJANG. Minimal 400 kata, idealnya 500-600 kata. JANGAN pendek!

STRUKTUR ARTIKEL (wajib diikuti):
1. LEAD (1 paragraf, minimal 4 kalimat): Kalimat pembuka yang menarik, memuat 5W+1H (Siapa, Apa, Kapan, Di Mana, Mengapa, Bagaimana). Keyword utama harus ada di paragraf pertama. Jelaskan secara rinci apa yang terjadi.

2. LATAR BELAKANG (1 paragraf, minimal 4 kalimat): Konteks mengapa berita ini penting, hubungan dengan situasi terkini. Tambahkan data historis atau statistik sebelumnya jika relevan.

3. ISI UTAMA (3-4 paragraf, masing-masing minimal 4 kalimat): Detail kejadian, data, statistik, fakta-fakta penting. Sertakan kutipan dari pihak terkait jika ada di sumber. Jelaskan kronologi kejadian secara detail.

4. DAMPAK/DI SIKNIKANSI (1-2 paragraf, minimal 4 kalimat): Pengaruh berita ini terhadap masyarakat, industri, atau kebijakan. Analisis lebih dalam tentang konsekuensi.

5. PENUTUP (1 paragraf, minimal 3 kalimat): Kesimpulan atau langkah selanjutnya yang diharapkan.

ATURAN PENULISAN:
- Gunakan Bahasa Indonesia baku, formal, profesional
- Hindari bahasa gaul, slang, atau terlalu kasual
- Setiap paragraf minimal 4 kalimat (ini sangat penting!)
- Total artikel MINIMAL 400 kata, idealnya 500-600 kata
- Sebutkan sumber: "Dilansir dari [Nama Media]"
- Jika ada data/angka, sertakan dengan akurat
- Jangan mengarang fakta yang tidak ada di sumber
- Tambahkan konteks relevan tentang Indonesia jika sesuai
- Kembangkan setiap paragraf dengan penjelasan detail, jangan terlalu singkat

FORMAT SUBJUDUL (subtitle):
- Ringkas inti berita dalam 1-2 kalimat
- Maksimal 120 karakter
- Menarik dan informatif

SEO TITLE:
- Ringkas, mengandung keyword utama
- Maksimal 60 karakter
- Membuat orang ingin mengklik

EXCERPT:
- 1-2 kalimat yang menggugah rasa ingin tahu
- Maksimal 160 karakter
- Bukan potongan acak dari artikel

METADESCRIPTION:
- Deskripsi menarik untuk search engine
- Maksimal 160 karakter
- Mengandung keyword dan call-to-action implisit

TAGS:
- 5-7 tag relevan dalam bahasa Indonesia
- Termasuk nama tempat/orang jika relevan
- Termasuk topik terkait

Output JSON:
{
  "title": "Judul artikel menarik dan SEO-friendly",
  "subtitle": "Ringkasan inti berita (maks 120 karakter)",
  "body": "Isi artikel dengan paragraf terstruktur. Pisahkan paragraf dengan \\n\\n",
  "excerpt": "Ringkasan engaging 1-2 kalimat (maks 160 karakter)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaDescription": "Deskripsi SEO menarik (maks 160 karakter)",
  "seoTitle": "Judul SEO ringkas (maks 60 karakter)",
  "category": "Kategori artikel"
}

PENTING: Output HARUS berupa JSON valid tanpa markdown code block.`;

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
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: REWRITE_PROMPT + '\n\n' + userMessage },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response
    const jsonStr = content.text.replace(/```json\n?|\n?```/g, '').trim();
    const result: RewriteResult = JSON.parse(jsonStr);

    return result;
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
