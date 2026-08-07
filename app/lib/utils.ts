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

export async function isDuplicate(title: string, originalUrl?: string): Promise<boolean> {
  // Cek duplikat berdasarkan judul
  const titleCount = await client.fetch(
    `count(*[_type == "post" && title == $title])`,
    { title }
  )
  if (titleCount > 0) return true

  // Cek duplikat berdasarkan URL sumber
  if (originalUrl) {
    const urlCount = await client.fetch(
      `count(*[_type == "post" && originalUrl == $url])`,
      { url: originalUrl }
    )
    if (urlCount > 0) return true
  }

  return false
}

// ═══════════════════════════════════════════════════════════
//  SLUG GENERATOR
// ═══════════════════════════════════════════════════════════

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
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
      const blockKey = `${prefix}-${Date.now()}-${index}`
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
