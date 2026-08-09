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
  category: string;
}

const REWRITE_PROMPT = `Anda adalah editor berita profesional Indonesia yang bekerja untuk portal berita "Warta Nusantara" (tanahjarang.com).

Tugas Anda adalah me-rewrite artikel berikut menjadi artikel baru yang:
1. Original dan bukan copy-paste dari sumber asli
2. Judul harus SEO-friendly, menarik, dan informatif
3. Gunakan bahasa Indonesia yang baik, benar, dan profesional
4. Tambahkan konteks lokal Indonesia jika relevan
5. Pertahankan fakta dan data yang akurat
6. Panjang artikel minimal 300 kata
7. Struktur artikel harus jelas (pendahuluan, isi, penutup)

Output harus dalam format JSON dengan struktur:
{
  "title": "Judul artikel baru",
  "subtitle": "Subjudul atau lead paragraph",
  "body": "Isi artikel dalam format paragraf (pisahkan paragraf dengan \\n\\n)",
  "excerpt": "Ringkasan singkat 1-2 kalimat untuk meta description",
  "tags": ["tag1", "tag2", "tag3"],
  "metaDescription": "Deskripsi untuk SEO (maksimal 160 karakter)",
  "category": "Kategori artikel (Nasional/Teknologi/Bisnis/Olahraga/Hiburan)"
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
