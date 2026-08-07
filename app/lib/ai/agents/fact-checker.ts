// ═══════════════════════════════════════════════════════════
//  FACT CHECKER AGENT — Cross-check fakta dari sumber
// ═══════════════════════════════════════════════════════════

import { createWithRetry, parseAIJson } from '../anthropic-client'
import type { TextBlock } from '@anthropic-ai/sdk/resources'
import { FACT_CHECKER_PROMPT } from './prompt-templates'

export interface FactCheckResult {
  verified: boolean
  confidence: number
  checkedFacts: {
    fact: string
    status: 'verified' | 'warning' | 'unverified'
    note: string
  }[]
  warnings: string[]
  suggestions: string[]
}

/**
 * Fact Checker: Verifikasi fakta dalam artikel
 */
export async function factCheck(
  articleTitle: string,
  articleContent: string,
  originalContent?: string
): Promise<FactCheckResult> {
  try {
    const userPrompt = `Verifikasi fakta dalam artikel berita ini.

JUDUL ARTIKEL: ${articleTitle}

KONTEN ARTIKEL:
${articleContent.substring(0, 3000)}
${originalContent ? `\nKONTEN SUMBER ASLI:\n${originalContent.substring(0, 3000)}` : ''}

Periksa semua fakta: nama, angka, tanggal, lokasi, klaim. Output dalam format JSON.`

    const message = await createWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: FACT_CHECKER_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    console.log(`[FactChecker] Response length: ${responseText.length}, stop_reason: ${message.stop_reason}`)
    if (responseText.length > 0) {
      console.log(`[FactChecker] Raw response (first 500 chars):`, responseText.substring(0, 500))
    }

    const parsed = parseAIJson(responseText)
    if (!parsed) {
      console.error('[FactChecker] Tidak bisa parse JSON:', responseText.substring(0, 500))
      return {
        verified: false,
        confidence: 0,
        checkedFacts: [],
        warnings: ['Gagal parse response fact checker'],
        suggestions: [],
      }
    }

    return {
      verified: parsed.verified !== false,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      checkedFacts: Array.isArray(parsed.checkedFacts) ? parsed.checkedFacts : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    }
  } catch (error) {
    console.error('[FactChecker] Error:', error)
    return {
      verified: false,
      confidence: 0,
      checkedFacts: [],
      warnings: [`Error fact check: ${error}`],
      suggestions: [],
    }
  }
}
