// ═══════════════════════════════════════════════════════════
//  AI REWRITER — Rewrite artikel menggunakan Claude API
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  timeout: 30000, // 30 second timeout
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

const REWRITE_PROMPT = `Anda adalah jurnalis profesional Indonesia. Buat artikel baru dari sumber di bawah.

ATURAN:
- 400-600 kata, 5-6 paragraf
- Paragraf 1: Lead (5W+1H)
- Paragraf 2-4: Isi utama dengan kutipan
- Paragraf 5: Dampak/analisis
- Paragraf 6: Penutup
- Bahasa Indonesia baku, sebutkan sumber
- Jangan mengarang fakta

Output JSON:
{
  "title": "Judul menarik",
  "subtitle": "Ringkasan maks 120 karakter",
  "body": "Isi artikel. Pisahkan paragraf dengan \\n\\n",
  "excerpt": "Ringkasan maks 160 karakter",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "metaDescription": "SEO deskripsi maks 160 karakter",
  "seoTitle": "Judul SEO maks 60 karakter",
  "focusKeyphrase": "kata kunci 2-4 kata",
  "ogDescription": "Social media deskripsi maks 200 karakter",
  "mainImageAlt": "Deskripsi gambar maks 125 karakter",
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
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
