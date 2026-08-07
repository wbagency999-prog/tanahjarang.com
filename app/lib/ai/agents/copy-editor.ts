// ═══════════════════════════════════════════════════════════
//  EDITOR AGENT — Copy Edit + Proofreader merged
//  Preserve block structure (h2, blockquote, normal)
// ═══════════════════════════════════════════════════════════

import { createWithRetry, parseAIJson } from '../anthropic-client'
import type { TextBlock } from '@anthropic-ai/sdk/resources'
import { EDITOR_PROMPT } from './prompt-templates'

export interface EditorResult {
  title: string
  subtitle: string
  excerpt: string
  body: { type: string; style: string; text: string }[]
  tags: string[]
  fixes: string[]
}

/**
 * Editor: Copy edit + proofread sekaligus, preserve block structure
 */
export async function editArticle(article: {
  title: string
  subtitle: string
  excerpt: string
  body: { style: string; text: string }[]
  tags: string[]
}): Promise<EditorResult | null> {
  try {
    // Reconstruct body text dengan style markers untuk AI
    const structuredBody = article.body
      .map((block) => {
        const prefix = block.style === 'h2' ? '[H2] ' : block.style === 'blockquote' ? '[QUOTE] ' : ''
        return `${prefix}${block.text}`
      })
      .join('\n\n')

    const userPrompt = `Perbaiki artikel berita berikut (editorial + proofreading sekaligus).

JUDUL: ${article.title}
SUB JUDUL: ${article.subtitle}
RINGKASAN: ${article.excerpt}
TAGS: ${article.tags.join(', ')}

KONTEN (dengan style markers):
${structuredBody}

PENTING: Pertahankan [H2] dan [QUOTE] saat mengembalikan hasil. Setiap paragraf tetap terpisah.`

    const message = await createWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: EDITOR_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    console.log(`[Editor] Response length: ${responseText.length}, stop_reason: ${message.stop_reason}`)

    const parsed = parseAIJson(responseText)
    if (!parsed) {
      console.error('[Editor] Tidak bisa parse JSON:', responseText.substring(0, 200))
      return null
    }

    // Parse body blocks — detect style dari markers atau field style
    const body = Array.isArray(parsed.body) ? parsed.body.map((block: any) => {
      let text = String(block.text || '').trim()
      let style = block.style || 'normal'

      // Detect style dari markers jika AI tidak mengembalikan style field
      if (text.startsWith('[H2] ')) {
        style = 'h2'
        text = text.substring(5)
      } else if (text.startsWith('[QUOTE] ')) {
        style = 'blockquote'
        text = text.substring(8)
      }

      return { type: 'block', style, text }
    }).filter((block: any) => block.text) : []

    return {
      title: parsed.title || article.title,
      subtitle: parsed.subtitle || article.subtitle,
      excerpt: parsed.excerpt || article.excerpt,
      body,
      tags: Array.isArray(parsed.tags) ? parsed.tags : article.tags,
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    }
  } catch (error) {
    console.error('[Editor] Error:', error)
    return null
  }
}
