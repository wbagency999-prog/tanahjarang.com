// ═══════════════════════════════════════════════════════════
//  CONTENT FILTERS — Filter konten tidak layak
// ═══════════════════════════════════════════════════════════

export const FILTER_KEYWORDS = {
  exclude: [
    'syur', 'vulgar', '18+', 'dewasa', 'bugil',
    'judi', 'togel', 'slot online',
    'hoax', 'kabar burung',
    'sponsored', 'advertisement', 'iklan berbayar',
  ],
};

export function shouldExclude(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();

  // Keyword filter
  if (FILTER_KEYWORDS.exclude.some((kw) => text.includes(kw.toLowerCase()))) {
    return true;
  }

  // Body terlalu pendek — kemungkinan navigation text, bukan artikel
  if (content.length < 100) {
    return true;
  }

  return false;
}
