// ═══════════════════════════════════════════════════════════
//  CONTENT FILTERS — Filter konten tidak layak
// ═══════════════════════════════════════════════════════════

export const FILTER_KEYWORDS = {
  exclude: [
    'syur', 'vulgar', '18+', 'dewasa', 'bugil',
    'judi', 'togel', 'slot online',
    'hoax', 'kabar burung',
  ],
  priority: [
    'ekonomi', 'bisnis', 'investasi', 'saham',
    'teknologi', 'ai', 'artificial intelligence',
    'pertambangan', 'nikel', 'komoditas',
    'politik', 'pemilu', 'pilkada',
    'olahraga', 'sepak bola', 'timnas',
  ],
};

export function shouldExclude(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();
  return FILTER_KEYWORDS.exclude.some((kw) => text.includes(kw.toLowerCase()));
}
