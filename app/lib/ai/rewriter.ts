// ═══════════════════════════════════════════════════════════
//  AI REWRITER — Claude-powered Article Rewrite Engine
// ═══════════════════════════════════════════════════════════

import { createWithRetry, parseAIJson } from './anthropic-client'
import type { TextBlock } from '@anthropic-ai/sdk/resources'
import { REWRITE_SYSTEM_PROMPT, CATEGORY_PROMPT } from './prompts'
import { toSanityBlocks } from '@/app/lib/utils'
import type { SanityBlock } from '@/app/lib/types'

export interface RewriteResult {
  title: string
  subtitle: string
  excerpt: string
  body: SanityBlock[]
  tags: string[]
}

// Re-export SanityBlock untuk backward compatibility
export type { SanityBlock }

/**
 * Rewrite artikel menggunakan Claude API
 */
export async function rewriteArticle(
  originalTitle: string,
  originalContent: string,
  sourceName: string
): Promise<RewriteResult | null> {
  try {
    // Truncate content untuk mengurangi waktu processing
    // 3000 char ≈ 500-600 kata — cukup untuk rewrite berkualitas
    const truncatedContent = originalContent.substring(0, 3000)

    const userPrompt = `TULIS ULANG artikel berita ini menjadi artikel baru yang berkualitas tinggi.

SUMBER: ${sourceName}
JUDUL ASLI: ${originalTitle}

KONTEN ASLI:
${truncatedContent}

INSTRUKSI:
1. Tulis ulang 100% original — jangan copy-paste kalimat dari sumber
2. Terapkan "piramida terbalik" — informasi terpenting di paragraf pertama (5W1H)
3. Judul harus informatif, bukan clickbait (maks 70 karakter)
4. Gunakan gaya jurnalistik Kompas/Detik — padat, lugas, profesional
5. Kutipan narasumber harus format: "Isi kutipan," kata [Nama], [Posisi].
6. Minimal 300 kata, ideal 400-500 kata
7. HAPUS semua junk text (ads, rekomendasi, sidebar)
8. Output HARUS dalam format JSON yang valid
9. Sertakan "Dikutip dari [Nama Sumber]" di awal artikel (paragraf pertama atau kedua), misal: "Wakil Menteri X mendorong... dikutip dari CNN Indonesia." — ini untuk attribution sumber berita`

    const message = await createWithRetry({
      model: 'claude-sonnet-5-20250514',
      max_tokens: 6000,
      system: REWRITE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse JSON dari response dengan robust fallback
    const parsed = parseAIJson(responseText)
    if (!parsed) {
      console.error('[Rewriter] Tidak bisa parse JSON dari response:', responseText.substring(0, 200))
      return null
    }

    // Convert body ke format Sanity Portable Text menggunakan shared utility
    const sanityBody: SanityBlock[] = toSanityBlocks(
      (parsed.body || [])
        .filter((block: any) => block && (block.text || block.style))
        .map((block: any) => ({
          text: (block.text || '').trim(),
          style: block.style || 'normal',
        })),
      'rw'
    )

    return {
      title: parsed.title || originalTitle,
      subtitle: parsed.subtitle || '',
      excerpt: parsed.excerpt || '',
      body: sanityBody,
      tags: parsed.tags || [],
    }
  } catch (error) {
    console.error('[Rewriter] Error:', error)
    return null
  }
}

/**
 * Tentukan kategori artikel berdasarkan konten
 */
export async function classifyCategory(
  title: string,
  content: string,
  categories: { title: string; slug: { current: string } | string }[]
): Promise<string | null> {
  try {
    const categoryList = categories
      .map((c) => `${typeof c.slug === 'string' ? c.slug : c.slug.current}: ${c.title}`)
      .join(', ')
    const prompt = CATEGORY_PROMPT.replace('{categories}', categoryList)

    const message = await createWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: prompt,
      messages: [
        {
          role: 'user',
          content: `Judul: ${title}\n\nKonten: ${content.substring(0, 500)}`,
        },
      ],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const parsed = parseAIJson<{ category?: string }>(responseText)
    return parsed?.category || null
  } catch (error) {
    console.error('[Category] Error:', error)
    return null
  }
}
