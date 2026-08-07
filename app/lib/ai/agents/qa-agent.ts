// ═══════════════════════════════════════════════════════════
//  QA AGENT — Quality Assurance Score (0-100)
// ═══════════════════════════════════════════════════════════

import { createWithRetry, parseAIJson } from '../anthropic-client'
import type { TextBlock } from '@anthropic-ai/sdk/resources'
import { QA_AGENT_PROMPT } from './prompt-templates'

export interface QAResult {
  score: number
  pass: boolean
  breakdown: {
    grammar: number
    structure: number
    seo: number
    originality: number
    information: number
  }
  issues: string[]
  suggestions: string[]
}

/**
 * QA Agent: Skor kualitas artikel (0-100)
 */
export async function runQA(article: {
  title: string
  subtitle: string
  excerpt: string
  bodyText: string
  tags: string[]
  metaTitle?: string
  metaDescription?: string
}, minScore: number = 90): Promise<QAResult> {
  try {
    const userPrompt = `Nilai kualitas artikel berita ini.

JUDUL: ${article.title}
SUB JUDUL: ${article.subtitle}
RINGKASAN: ${article.excerpt}
TAGS: ${article.tags.join(', ')}
META TITLE: ${article.metaTitle || '-'}
META DESCRIPTION: ${article.metaDescription || '-'}

KONTEN:
${article.bodyText}

Beri skor dan breakdown per kategori. Output dalam format JSON.`

    const message = await createWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: QA_AGENT_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    console.log(`[QA] Response length: ${responseText.length}, stop_reason: ${message.stop_reason}`)
    if (responseText.length < 10) {
      console.error('[QA] Response terlalu pendek:', responseText)
    }

    // Debug: log full response untuk troubleshooting
    if (responseText.length > 0) {
      console.log(`[QA] Raw response (first 500 chars):`, responseText.substring(0, 500))
    }

    let parsed = parseAIJson(responseText)
    
    // Fallback: coba extract score dari raw text jika JSON parse gagal
    if (!parsed) {
      console.error('[QA] JSON parse gagal, mencoba fallback extraction...')
      
      // Coba extract score dari pattern seperti "score": 85 atau "score":85
      const scoreMatch = responseText.match(/["']?score["']?\s*[:=]\s*(\d{1,3})/i)
      if (scoreMatch) {
        const fallbackScore = parseInt(scoreMatch[1])
        if (fallbackScore >= 0 && fallbackScore <= 100) {
          console.log(`[QA] Fallback score ditemukan: ${fallbackScore}`)
          parsed = {
            score: fallbackScore,
            pass: fallbackScore >= minScore,
            breakdown: {
              grammar: Math.round(fallbackScore * 0.25),
              structure: Math.round(fallbackScore * 0.25),
              seo: Math.round(fallbackScore * 0.20),
              originality: Math.round(fallbackScore * 0.15),
              information: Math.round(fallbackScore * 0.15),
            },
            issues: ['Score diambil dari fallback parser'],
            suggestions: [],
          }
        }
      }
    }
    
    if (!parsed) {
      console.error('[QA] Fallback juga gagal. Response:', responseText.substring(0, 300))
      return {
        score: 0,
        pass: false,
        breakdown: { grammar: 0, structure: 0, seo: 0, originality: 0, information: 0 },
        issues: ['Gagal parse response QA (semua metode gagal)'],
        suggestions: [],
      }
    }
    
    const score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0

    return {
      score,
      pass: score >= minScore,
      breakdown: {
        grammar: parsed.breakdown?.grammar || 0,
        structure: parsed.breakdown?.structure || 0,
        seo: parsed.breakdown?.seo || 0,
        originality: parsed.breakdown?.originality || 0,
        information: parsed.breakdown?.information || 0,
      },
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    }
  } catch (error) {
    console.error('[QA] Error:', error)
    return {
      score: 0,
      pass: false,
      breakdown: { grammar: 0, structure: 0, seo: 0, originality: 0, information: 0 },
      issues: [`Error QA: ${error}`],
      suggestions: [],
    }
  }
}
