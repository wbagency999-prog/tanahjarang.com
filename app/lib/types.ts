// ═══════════════════════════════════════════════════════════
//  SHARED TYPES — Tipe data bersama (untuk hindari circular deps)
// ═══════════════════════════════════════════════════════════

/**
 * Sanity Portable Text Block format
 */
export interface SanityBlock {
  _type: 'block'
  _key: string
  style: string
  children: {
    _type: 'span'
    _key: string
    text: string
    marks: string[]
  }[]
  markDefs: any[]
}
