// ═══════════════════════════════════════════════════════════
//  SEO OPTIMIZER — AI-powered SEO Metadata Generator
// ═══════════════════════════════════════════════════════════

import { createWithRetry, parseAIJson } from './anthropic-client'
import type { TextBlock } from '@anthropic-ai/sdk/resources'
import { SEO_SYSTEM_PROMPT } from './prompts'

export interface SEOData {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  altText: string
  seoScore: number
}

/**
 * Generate SEO metadata untuk artikel
 */
export async function generateSEO(
  title: string,
  subtitle: string,
  excerpt: string,
  bodyText: string
): Promise<SEOData | null> {
  try {
    const articleText = bodyText.substring(0, 2000) // Batasi token

    const userPrompt = `Artikel berita:

Judul: ${title}
Sub Judul: ${subtitle}
Ringkasan: ${excerpt}
Konten: ${articleText}

Generate metadata SEO yang optimal dalam format JSON.`

    const message = await createWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SEO_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    console.log(`[SEO] Response length: ${responseText.length}, stop_reason: ${message.stop_reason}`)

    const parsed = parseAIJson(responseText)
    if (!parsed) {
      console.error('[SEO] Tidak bisa parse JSON dari response:', responseText.substring(0, 200))
      return null
    }

    return {
      metaTitle: (parsed.metaTitle || title).substring(0, 60),
      metaDescription: (parsed.metaDescription || excerpt).substring(0, 160),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      altText: parsed.altText || title,
      seoScore: typeof parsed.seoScore === 'number' ? Math.min(100, Math.max(0, parsed.seoScore)) : 50,
    }
  } catch (error) {
    console.error('[SEO Optimizer] Error:', error)
    return null
  }
}

/**
 * Hitung skor SEO berdasarkan field yang sudah ada (fallback tanpa AI)
 */
export function calculateSEOScoreFallback(data: {
  title: string
  metaTitle?: string
  metaDescription?: string
  excerpt?: string
  tags?: string[]
  mainImage?: boolean
}): number {
  let score = 0

  // Judul
  if (data.title) score += 15
  if (data.title && data.title.length >= 30 && data.title.length <= 70) score += 10

  // Meta title
  if (data.metaTitle) score += 15

  // Meta description
  if (data.metaDescription) score += 15
  if (data.metaDescription && data.metaDescription.length >= 120) score += 5

  // Excerpt
  if (data.excerpt) score += 10

  // Tags
  if (data.tags && data.tags.length >= 3) score += 10
  if (data.tags && data.tags.length >= 5) score += 5

  // Gambar
  if (data.mainImage) score += 15

  return Math.min(100, score)
}
