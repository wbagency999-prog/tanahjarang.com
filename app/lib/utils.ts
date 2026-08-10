// ═══════════════════════════════════════════════════════════
//  SHARED UTILS — Fungsi utilitas bersama
// ═══════════════════════════════════════════════════════════

import { client } from '@/sanity/client'
import type { SanityBlock } from '@/app/lib/types'

// Re-export SanityBlock untuk backward compatibility
export type { SanityBlock }

// ═══════════════════════════════════════════════════════════
//  DEDUPLICATION
// ═══════════════════════════════════════════════════════════

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().substring(0, 50)
}

const localDedupCache = new Map<string, number>()
const DEDUP_CACHE_TTL_MS = 30 * 60 * 1000

export async function isDuplicate(title: string, originalUrl?: string): Promise<boolean> {
  const now = Date.now()
  const titleHash = simpleHash(normalizeTitle(title))
  if (localDedupCache.has(titleHash)) {
    const cachedTime = localDedupCache.get(titleHash)!
    if (now - cachedTime < DEDUP_CACHE_TTL_MS) return true
    localDedupCache.delete(titleHash)
  }
  if (originalUrl) {
    const urlHash = simpleHash(originalUrl)
    if (localDedupCache.has(urlHash)) {
      const cachedTime = localDedupCache.get(urlHash)!
      if (now - cachedTime < DEDUP_CACHE_TTL_MS) return true
      localDedupCache.delete(urlHash)
    }
  }
  const titleCount = await client.fetch(`count(*[_type == "post" && title == $title])`, { title })
  if (titleCount > 0) { localDedupCache.set(titleHash, now); return true }
  if (originalUrl) {
    const urlCount = await client.fetch(`count(*[_type == "post" && originalUrl == $url])`, { url: originalUrl })
    if (urlCount > 0) { localDedupCache.set(simpleHash(originalUrl), now); return true }
  }
  return false
}

export function markAsPublished(title: string, originalUrl?: string): void {
  const now = Date.now()
  localDedupCache.set(simpleHash(normalizeTitle(title)), now)
  if (originalUrl) localDedupCache.set(simpleHash(originalUrl), now)
}

//  SLUG GENERATOR
// ═══════════════════════════════════════════════════════════

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 96)
}

// ═══════════════════════════════════════════════════════════
//  SANITY BLOCK CREATION
// ═══════════════════════════════════════════════════════════

let _blockCounter = 0

/**
 * Generate unique key untuk Sanity Portable Text
 */
function uniqueKey(prefix: string): string {
  _blockCounter++
  return `${prefix}-${Date.now()}-${_blockCounter}`
}

/**
 * Buat Sanity Portable Text block dari text string
 */
export function createTextBlock(
  text: string,
  style: string = 'normal',
  prefix: string = 'b'
): SanityBlock | null {
  const cleaned = (text || '').trim()
  if (!cleaned) return null

  const blockKey = uniqueKey(prefix)
  return {
    _type: 'block' as const,
    _key: blockKey,
    style,
    children: [
      {
        _type: 'span' as const,
        _key: `s-${blockKey}`,
        text: cleaned,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

/**
 * Konversi array of {text, style?} ke format Sanity Portable Text blocks
 */
export function toSanityBlocks(
  items: { text: string; style?: string }[],
  prefix: string = 'blk'
): SanityBlock[] {
  return items
    .filter((item) => item && item.text?.trim())
    .map((item, index) => {
      const blockKey = `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`
      return {
        _type: 'block' as const,
        _key: blockKey,
        style: item.style || 'normal',
        children: [
          {
            _type: 'span' as const,
            _key: `s-${blockKey}`,
            text: item.text.trim(),
            marks: [],
          },
        ],
        markDefs: [],
      }
    })
}

/**
 * Buat fallback body blocks dari text string (split per paragraf)
 */
export function createFallbackBody(
  text: string,
  prefix: string = 'fallback'
): SanityBlock[] {
  // Split by double newlines (paragraph breaks) or single newlines
  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20) // Skip very short fragments

  if (paragraphs.length === 0) {
    const block = createTextBlock(text, 'normal', prefix)
    return block ? [block] : []
  }

  return paragraphs
    .map((paragraph, i) => createTextBlock(paragraph, 'normal', `${prefix}-${i}`))
    .filter((block): block is SanityBlock => block !== null)
}

/**
 * Buat body block dengan prefix sumber
 */
export function createSourceBody(
  sourceName: string,
  sourceUrl: string,
  content: string,
  prefix: string = 'src'
): SanityBlock[] {
  const blocks: SanityBlock[] = []

  const sourceBlock = createTextBlock(`Sumber: ${sourceName} — ${sourceUrl}`, 'normal', `${prefix}-src`)
  if (sourceBlock) blocks.push(sourceBlock)

  const contentBlock = createTextBlock(content, 'normal', `${prefix}-content`)
  if (contentBlock) blocks.push(contentBlock)

  return blocks
}
