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
  // ANTARA News
  { name: 'ANTARA Nasional', url: 'https://www.antaranews.com/rss/terkini', category: 'nasional', enabled: true },
  { name: 'ANTARA Bisnis', url: 'https://www.antaranews.com/rss/ekonomi', category: 'bisnis', enabled: true },
  { name: 'ANTARA Tekno', url: 'https://www.antaranews.com/rss/teknologi', category: 'teknologi', enabled: true },
  { name: 'ANTARA Olahraga', url: 'https://www.antaranews.com/rss/olahraga', category: 'olahraga', enabled: true },

  // Kompas
  { name: 'Kompas Nasional', url: 'https://www.kompas.com/rss/nasional', category: 'nasional', enabled: true },
  { name: 'Kompas Tekno', url: 'https://www.kompas.com/rss/tekno', category: 'teknologi', enabled: true },
  { name: 'Kompas Bisnis', url: 'https://www.kompas.com/rss/bisnis', category: 'bisnis', enabled: true },

  // Detik
  { name: 'Detik Nasional', url: 'https://rss.detik.com/index.php/nasional', category: 'nasional', enabled: true },
  { name: 'Detik Tekno', url: 'https://rss.detik.com/index.php/tekno', category: 'teknologi', enabled: true },
  { name: 'Detik Sport', url: 'https://rss.detik.com/index.php/sport', category: 'olahraga', enabled: true },

  // CNBC Indonesia
  { name: 'CNBC Bisnis', url: 'https://www.cnbcindonesia.com/news/rss', category: 'bisnis', enabled: true },
  { name: 'CNBC Tekno', url: 'https://www.cnbcindonesia.com/tech/rss', category: 'teknologi', enabled: true },

  // CNN Indonesia
  { name: 'CNN Nasional', url: 'https://www.cnnindonesia.com/nasional/rss', category: 'nasional', enabled: true },
  { name: 'CNN Tekno', url: 'https://www.cnnindonesia.com/teknologi/rss', category: 'teknologi', enabled: true },
  { name: 'CNN Olahraga', url: 'https://www.cnnindonesia.com/olahraga/rss', category: 'olahraga', enabled: true },

  // Liputan6
  { name: 'Liputan6 Nasional', url: 'https://www.liputan6.com/rss/nasional', category: 'nasional', enabled: true },
  { name: 'Liputan6 Tekno', url: 'https://www.liputan6.com/rss/tekno', category: 'teknologi', enabled: true },

  // Tirto.id
  { name: 'Tirto', url: 'https://tirto.id/feed', category: 'nasional', enabled: true },
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
