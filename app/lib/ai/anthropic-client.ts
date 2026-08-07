// ═══════════════════════════════════════════════════════════
//  SHARED ANTHROPIC CLIENT — Supports Syncera Gateway + Retry
// ═══════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk'
import type AnthropicTypes from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
})

export default client

// ═══════════════════════════════════════════════════════════
//  RETRY WRAPPER — Exponential backoff for API calls
// ═══════════════════════════════════════════════════════════

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000
const API_TIMEOUT_MS = 120_000 // 2 menit timeout per API call

/**
 * Call Claude API with automatic retry + exponential backoff.
 * Handles rate limits (429) and server errors (5xx).
 * Includes timeout to prevent hanging.
 */
export async function createWithRetry(
  params: AnthropicTypes.MessageCreateParams,
  retries: number = MAX_RETRIES
): Promise<AnthropicTypes.Message> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Race between API call and timeout
      const apiCall = client.messages.create({ ...params, stream: false } as any)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`API timeout after ${API_TIMEOUT_MS / 1000}s`)), API_TIMEOUT_MS)
      )
      const result = await Promise.race([apiCall, timeout]) as AnthropicTypes.Message
      return result as AnthropicTypes.Message
    } catch (error: any) {
      const isRateLimit = error?.status === 429
      const isServerError = error?.status >= 500
      const isRetryable = isRateLimit || isServerError

      if (!isRetryable || attempt === retries) {
        throw error
      }

      // Exponential backoff: 2s, 4s, 8s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      // Use retry-after header if available (rate limit)
      const retryAfter = error?.headers?.['retry-after']
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : delay

      console.warn(
        `[Anthropic] Retry ${attempt + 1}/${retries} — ${isRateLimit ? 'rate limit' : `HTTP ${error?.status}`} — waiting ${waitMs}ms`
      )
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  throw new Error('Max retries exceeded')
}

// ═══════════════════════════════════════════════════════════
//  ROBUST JSON PARSING — Multi-fallback parser
// ═══════════════════════════════════════════════════════════

/**
 * Parse JSON dari AI response dengan multiple fallback strategies.
 * Handles: markdown code blocks, trailing commas, truncated output, prefix/suffix text.
 */
export function parseAIJson<T = any>(responseText: string): T | null {
  if (!responseText || responseText.trim().length === 0) return null

  // Strategy 1: Extract from markdown code block
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    const cleaned = cleanJsonString(codeBlockMatch[1].trim())
    try { return JSON.parse(cleaned) } catch {}
  }

  // Strategy 2: Find the outermost { } or [ ]
  const jsonMatch = responseText.match(/\{[\s\S]*\}/) || responseText.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    const cleaned = cleanJsonString(jsonMatch[0])
    try { return JSON.parse(cleaned) } catch {}

    // Strategy 3: Try progressively smaller substrings (handle trailing junk)
    // But be more careful — only try clean cut points
    const startIdx = responseText.indexOf(jsonMatch[0][0] === '{' ? '{' : '[')
    const openChar = jsonMatch[0][0]
    const closeChar = openChar === '{' ? '}' : ']'

    // Find matching close bracket by counting
    let depth = 0
    let lastValidEnd = -1
    for (let i = startIdx; i < responseText.length; i++) {
      if (responseText[i] === openChar) depth++
      else if (responseText[i] === closeChar) {
        depth--
        if (depth === 0) {
          lastValidEnd = i + 1
          break
        }
      }
    }

    if (lastValidEnd > startIdx) {
      const candidate = responseText.substring(startIdx, lastValidEnd)
      const trimmed = candidate.replace(/,\s*([\]}])/g, '$1')
      try { return JSON.parse(trimmed) } catch {}
    }
  }

  // Strategy 4: Direct parse (response is pure JSON)
  try {
    const cleaned = cleanJsonString(responseText.trim())
    return JSON.parse(cleaned)
  } catch {}

  // Strategy 5: JSON Repair — fix truncated JSON
  try {
    const repaired = repairTruncatedJson(responseText)
    if (repaired) return repaired
  } catch {}

  return null
}

/**
 * Attempt to repair truncated JSON by adding missing closing brackets
 */
function repairTruncatedJson(text: string): any | null {
  // Find the first { or [
  const firstBrace = text.indexOf('{')
  const firstBracket = text.indexOf('[')
  
  let startIdx = -1
  let openChar = '{'
  let closeChar = '}'
  
  if (firstBrace === -1 && firstBracket === -1) return null
  if (firstBrace === -1) { startIdx = firstBracket; openChar = '['; closeChar = ']' }
  else if (firstBracket === -1) { startIdx = firstBrace }
  else if (firstBrace < firstBracket) { startIdx = firstBrace }
  else { startIdx = firstBracket; openChar = '['; closeChar = ']' }

  let depth = 0
  let lastOpenIdx = -1
  const openStack: string[] = []

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{' || ch === '[') {
      depth++
      openStack.push(ch)
      lastOpenIdx = i
    } else if (ch === '}' || ch === ']') {
      const expected = ch === '}' ? '{' : '['
      if (openStack.length > 0 && openStack[openStack.length - 1] === expected) {
        openStack.pop()
        depth--
      }
    }
  }

  // If we have unclosed brackets, try to close them
  if (openStack.length > 0) {
    let truncated = text.substring(startIdx)
    // Remove trailing incomplete text (after last complete value)
    const lastCompleteValue = Math.max(
      truncated.lastIndexOf('"'),
      truncated.lastIndexOf('0'),
      truncated.lastIndexOf('1'),
      truncated.lastIndexOf('true'),
      truncated.lastIndexOf('false'),
      truncated.lastIndexOf('null')
    )
    if (lastCompleteValue > 0) {
      truncated = truncated.substring(0, lastCompleteValue + 1)
    }
    // Close all open brackets
    for (let i = openStack.length - 1; i >= 0; i--) {
      truncated += openStack[i] === '{' ? '}' : ']'
    }
    const cleaned = cleanJsonString(truncated)
    try { return JSON.parse(cleaned) } catch {}
  }

  return null
}

function cleanJsonString(str: string): string {
  return str
    .replace(/,\s*([\]}])/g, '$1')  // Remove trailing commas
    .replace(/[\x00-\x1F\x7F]/g, ' ')  // Remove control characters
    .trim()
}
