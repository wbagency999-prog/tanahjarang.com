// ═══════════════════════════════════════════════════════════
//  RSS & WEB SOURCE CONFIGS — Universal News Sources
// ═══════════════════════════════════════════════════════════

export interface FeedSource {
  name: string
  url: string
  category: string
  type: 'rss' | 'web'
  /** CSS selector untuk web scraping (opsional, per-sumber) */
  selectors?: {
    title?: string
    content?: string
    image?: string
    date?: string
    link?: string
    listItems?: string
  }
}

// ─── Indonesian Sources ───────────────────────────────────
export const INDONESIAN_RSS: FeedSource[] = [
  // CNN Indonesia (nasional, teknologi, olahraga)
  {
    name: 'CNN Indonesia',
    url: 'https://www.cnnindonesia.com/nasional/rss',
    category: 'nasional',
    type: 'rss',
    selectors: { content: '.article-body' },
  },
  {
    name: 'CNN Tekno',
    url: 'https://www.cnnindonesia.com/teknologi/rss',
    category: 'teknologi',
    type: 'rss',
    selectors: { content: '.article-body' },
  },
  {
    name: 'CNN Olahraga',
    url: 'https://www.cnnindonesia.com/olahraga/rss',
    category: 'olahraga',
    type: 'rss',
    selectors: { content: '.article-body' },
  },

  // Tempo (nasional)
  {
    name: 'Tempo',
    url: 'https://rss.tempo.co/nasional',
    category: 'nasional',
    type: 'rss',
    selectors: { content: '.detail-content' },
  },

  // Antara News (nasional, internasional)
  {
    name: 'Antara',
    url: 'https://www.antaranews.com/rss/terkini',
    category: 'nasional',
    type: 'rss',
  },
  {
    name: 'Antara Internasional',
    url: 'https://www.antaranews.com/rss/internasional',
    category: 'internasional',
    type: 'rss',
  },

  // CNBC Indonesia (bisnis, tekno)
  {
    name: 'CNBC Bisnis',
    url: 'https://www.cnbcindonesia.com/market/rss',
    category: 'nasional',
    type: 'rss',
  },
  {
    name: 'CNBC Tekno',
    url: 'https://www.cnbcindonesia.com/tech/rss',
    category: 'teknologi',
    type: 'rss',
  },
]

// ─── International Sources ────────────────────────────────
export const INTERNATIONAL_RSS: FeedSource[] = [
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'internasional',
    type: 'rss',
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'teknologi',
    type: 'rss',
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'internasional',
    type: 'rss',
  },
]

// ─── Gabungan Semua Sumber ────────────────────────────────
export const ALL_SOURCES: FeedSource[] = [
  ...INDONESIAN_RSS,
  ...INTERNATIONAL_RSS,
]

/**
 * Ambil sources berdasarkan mode
 */
export function getSources(mode: 'all' | 'indonesia' | 'international' = 'all'): FeedSource[] {
  switch (mode) {
    case 'indonesia':
      return INDONESIAN_RSS
    case 'international':
      return INTERNATIONAL_RSS
    default:
      return ALL_SOURCES
  }
}
