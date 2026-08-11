// ═══════════════════════════════════════════════════════════
//  RSS FEEDS — Konfigurasi sumber berita untuk autopilot
// ═══════════════════════════════════════════════════════════

export interface RSSFeed {
  name: string;
  url: string;
  category: string;
  enabled: boolean;
}

export const RSS_FEEDS: RSSFeed[] = [
  // CNN Indonesia
  { name: 'CNN Nasional', url: 'https://www.cnnindonesia.com/nasional/rss', category: 'nasional', enabled: true },
  { name: 'CNN Tekno', url: 'https://www.cnnindonesia.com/teknologi/rss', category: 'teknologi', enabled: true },
  { name: 'CNN Olahraga', url: 'https://www.cnnindonesia.com/olahraga/rss', category: 'olahraga', enabled: true },
  { name: 'CNN Hiburan', url: 'https://www.cnnindonesia.com/hiburan/rss', category: 'hiburan', enabled: true },

  // CNBC Indonesia
  { name: 'CNBC Bisnis', url: 'https://www.cnbcindonesia.com/news/rss', category: 'bisnis', enabled: true },
  { name: 'CNBC Tekno', url: 'https://www.cnbcindonesia.com/tech/rss', category: 'teknologi', enabled: true },
];

// Mapping kategori Sanity
export const CATEGORY_MAP: Record<string, string> = {
  'nasional': 'Nasional',
  'internasional': 'Internasional',
  'teknologi': 'Teknologi',
  'olahraga': 'Olahraga',
  'hiburan': 'Hiburan',
  'bisnis': 'Bisnis',
  'pendidikan': 'Pendidikan',
  'kesehatan': 'Kesehatan',
  'otomotif': 'Otomotif',
};

// Filter kata kunci untuk filtering
export const FILTER_KEYWORDS = {
  // Kata kunci yang harus dihindari (konten sensitif/inappropriate)
  exclude: [
    'syur', 'vulgar', '18+', 'dewasa', 'bugil',
    'judi', 'togel', 'slot online',
    'hoax', 'kabar burung',
  ],
  // Kata kunci yang diprioritaskan
  priority: [
    'ekonomi', 'bisnis', 'investasi', 'saham',
    'teknologi', 'ai', 'artificial intelligence',
    'pertambangan', 'nikel', 'komoditas',
    'politik', 'pemilu', 'pilkada',
    'olahraga', 'sepak bola', 'timnas',
  ],
};
