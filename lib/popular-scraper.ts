// ═══════════════════════════════════════════════════════════
//  POPULAR SCRAPER — Ambil berita terpopuler dari situs berita
// ═══════════════════════════════════════════════════════════

import * as cheerio from 'cheerio';

export interface PopularArticle {
  title: string;
  link: string;
  category: string;
  sourceName: string;
  imageUrl?: string;
  content?: string;
  excerpt?: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

// ═══ KATEGORI DETECTION ═══

function detectCategoryFromUrl(url: string): string {
  const u = url.toLowerCase();

  // Kompas
  if (u.includes('bola.kompas')) return 'olahraga';
  if (u.includes('otomotif.kompas')) return 'otomotif';
  if (u.includes('lifestyle.kompas')) return 'hiburan';
  if (u.includes('nasional.kompas') || u.includes('megapolitan.kompas')) return 'nasional';
  if (u.includes('internasional.kompas') || u.includes('global.kompas')) return 'internasional';
  if (u.includes('tekno.kompas')) return 'teknologi';
  if (u.includes('money.kompas') || u.includes('bisnis.kompas')) return 'bisnis';
  if (u.includes('health.kompas')) return 'kesehatan';
  if (u.includes('edu.kompas')) return 'pendidikan';
  if (u.includes('.kompas.com/read/')) {
    const pathMatch = u.match(/kompas\.com\/([^/]+)\//);
    if (pathMatch) {
      const section = pathMatch[1];
      const sectionMap: Record<string, string> = {
        'read': 'nasional', 'global': 'internasional', 'bola': 'olahraga',
        'otomotif': 'otomotif', 'tekno': 'teknologi', 'lifestyle': 'hiburan',
        'money': 'bisnis', 'health': 'kesehatan', 'megapolitan': 'nasional',
        'sains': 'teknologi', 'edukasi': 'pendidikan',
      };
      return sectionMap[section] || 'nasional';
    }
  }

  // Liputan6
  if (u.includes('liputan6.com/bisnis/') || u.includes('liputan6.com/ekonomi/')) return 'bisnis';
  if (u.includes('liputan6.com/teknologi/')) return 'teknologi';
  if (u.includes('liputan6.com/otomotif/')) return 'otomotif';
  if (u.includes('liputan6.com/bola/') || u.includes('sport.liputan6.com')) return 'olahraga';
  if (u.includes('liputan6.com/hot/')) return 'hiburan';
  if (u.includes('liputan6.com/cek-fakta/')) return 'nasional';
  if (u.includes('liputan6.com/peristiwa/') || u.includes('liputan6.com/megapolitan/')) return 'nasional';
  if (u.includes('liputan6.com/read/')) {
    const pathMatch = u.match(/liputan6\.com\/([^/]+)\//);
    if (pathMatch) {
      const section = pathMatch[1];
      const sectionMap: Record<string, string> = {
        'bisnis': 'bisnis', 'ekonomi': 'bisnis', 'teknologi': 'teknologi',
        'otomotif': 'otomotif', 'bola': 'olahraga', 'hot': 'hiburan',
        'cek-fakta': 'nasional', 'peristiwa': 'nasional', 'megapolitan': 'nasional',
      };
      return sectionMap[section] || 'nasional';
    }
  }

  // SINDOnews
  if (u.includes('nasional.sindonews.com') || u.includes('daerah.sindonews.com')) return 'nasional';
  if (u.includes('international.sindonews.com')) return 'internasional';
  if (u.includes('sports.sindonews.com')) return 'olahraga';
  if (u.includes('tekno.sindonews.com')) return 'teknologi';
  if (u.includes('otomotif.sindonews.com')) return 'otomotif';
  if (u.includes('ekonomi.sindonews.com') || u.includes('bisnis.sindonews.com')) return 'bisnis';
  if (u.includes('lifestyle.sindonews.com')) return 'hiburan';
  if (u.includes('sindonews.com/read/')) {
    const pathMatch = u.match(/([a-z]+)\.sindonews\.com/);
    if (pathMatch) {
      const sectionMap: Record<string, string> = {
        'nasional': 'nasional', 'daerah': 'nasional', 'international': 'internasional',
        'sports': 'olahraga', 'tekno': 'teknologi', 'otomotif': 'otomotif',
        'ekonomi': 'bisnis', 'lifestyle': 'hiburan',
      };
      return sectionMap[pathMatch[1]] || 'nasional';
    }
  }

  // Detik
  if (u.includes('news.detik.com') || u.includes('jakarta.detik.com') || u.includes('jateng.detik.com')) return 'nasional';
  if (u.includes('finance.detik.com') || u.includes('market.detik.com')) return 'bisnis';
  if (u.includes('inet.detik.com') || u.includes('tekno.detik.com')) return 'teknologi';
  if (u.includes('sport.detik.com') || u.includes('sepakbola.detik.com')) return 'olahraga';
  if (u.includes('oto.detik.com')) return 'otomotif';
  if (u.includes('travel.detik.com')) return 'hiburan';
  if (u.includes('health.detik.com')) return 'kesehatan';
  if (u.includes('female.detik.com') || u.includes('food.detik.com')) return 'hiburan';
  if (u.includes('detik.com/')) return 'nasional';

  // ANTARA
  if (u.includes('antaranews.com/berita/')) {
    if (u.includes('/politik/') || u.includes('/hukum/')) return 'nasional';
    return 'nasional';
  }

  return 'nasional';
}

// ═══ SCRAPER: KOMPAS ═══

async function fetchFromKompas(): Promise<PopularArticle[]> {
  try {
    const res = await fetch('https://indeks.kompas.com/terpopuler', {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: PopularArticle[] = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      if (title.length < 20 || !href.includes('.kompas.com/read/')) return;

      // Skip duplicate links (same title)
      if (articles.some(a => a.link === href)) return;

      articles.push({
        title,
        link: href,
        category: detectCategoryFromUrl(href),
        sourceName: 'Kompas',
      });
    });

    return articles;
  } catch {
    return [];
  }
}

// ═══ SCRAPER: LIPUTAN6 ═══

async function fetchFromLiputan6(): Promise<PopularArticle[]> {
  try {
    const res = await fetch('https://www.liputan6.com/popular', {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: PopularArticle[] = [];
    const seen = new Set<string>();

    // Prioritas: ambil dari sidebar "populer" (ranking 1-16)
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      if (title.length < 20 || !href.includes('/read/')) return;
      if (seen.has(href)) return;
      seen.add(href);

      // Ambil gambar dari parent/sibling img
      let imageUrl: string | undefined;
      const parent = $(el).closest('div, article, li');
      const img = parent.find('img').first().attr('src');
      if (img && img.startsWith('http')) imageUrl = img;

      articles.push({
        title,
        link: href,
        category: detectCategoryFromUrl(href),
        sourceName: 'Liputan6',
        imageUrl,
      });
    });

    return articles;
  } catch {
    return [];
  }
}

// ═══ SCRAPER: ANTARA ═══

async function fetchFromAntara(): Promise<PopularArticle[]> {
  try {
    const res = await fetch('https://www.antaranews.com/terpopuler', {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: PopularArticle[] = [];
    const seen = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      if (title.length < 20 || !href.includes('/berita/')) return;
      if (seen.has(href)) return;
      seen.add(href);

      let imageUrl: string | undefined;
      const parent = $(el).closest('div, article');
      const img = parent.find('img').first().attr('src');
      if (img && img.startsWith('http')) imageUrl = img;

      articles.push({
        title,
        link: href.startsWith('http') ? href : `https://www.antaranews.com${href}`,
        category: detectCategoryFromUrl(href),
        sourceName: 'ANTARA',
        imageUrl,
      });
    });

    return articles;
  } catch {
    return [];
  }
}

// ═══ SCRAPER: SINDONEWS ═══

async function fetchFromSindonews(): Promise<PopularArticle[]> {
  try {
    const res = await fetch('https://www.sindonews.com/popular/today', {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: PopularArticle[] = [];
    const seen = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      if (title.length < 20 || !href.includes('.sindonews.com/read/')) return;
      if (seen.has(href)) return;
      seen.add(href);

      let imageUrl: string | undefined;
      const parent = $(el).closest('div, article');
      const img = parent.find('img').first().attr('src');
      if (img && img.startsWith('http')) imageUrl = img;

      articles.push({
        title,
        link: href,
        category: detectCategoryFromUrl(href),
        sourceName: 'SINDOnews',
        imageUrl,
      });
    });

    return articles;
  } catch {
    return [];
  }
}

// ═══ SCRAPER: DETIK ═══

async function fetchFromDetik(): Promise<PopularArticle[]> {
  try {
    const res = await fetch('https://www.detik.com/terpopuler', {
      headers: {
        ...HEADERS,
        'Referer': 'https://www.detik.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: PopularArticle[] = [];
    const seen = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim().replace(/\s+/g, ' ');
      if (title.length < 20 || !href.includes('/d-')) return;
      if (seen.has(href)) return;
      seen.add(href);

      let imageUrl: string | undefined;
      const parent = $(el).closest('div, article, li');
      const img = parent.find('img').first().attr('src');
      if (img && img.startsWith('http')) imageUrl = img;

      articles.push({
        title,
        link: href,
        category: detectCategoryFromUrl(href),
        sourceName: 'Detik',
        imageUrl,
      });
    });

    return articles;
  } catch {
    return [];
  }
}

// ═══ MAIN ═══

// Fetch konten artikel dari URL asli
async function fetchArticleContent(url: string): Promise<{ content: string; excerpt: string; imageUrl: string | null }> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { content: '', excerpt: '', imageUrl: null };

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove script, style, nav, footer, header
    $('script, style, nav, footer, header, aside, .sidebar, .advertisement, .ads').remove();

    // Try common article body selectors
    const bodySelectors = [
      'article', '.detail-text', '.detail__body', '.text-content',
      '.article-content', '.post-content', '.entry-content',
      '.content-article', '#detail-text', '.detail_body',
      '[class*=detail] [class*=body]', '[class*=article] [class*=content]',
    ];

    let bodyText = '';
    for (const sel of bodySelectors) {
      const el = $(sel).first();
      if (el.length) {
        bodyText = el.text().trim().replace(/\s+/g, ' ');
        if (bodyText.length > 100) break;
      }
    }

    // Fallback: find largest text block in <p> tags
    if (bodyText.length < 100) {
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30) paragraphs.push(text);
      });
      bodyText = paragraphs.join('\n\n');
    }

    // Extract excerpt from meta description or first paragraph
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const excerpt = metaDesc.substring(0, 200) || bodyText.substring(0, 200);

    // Extract image
    let imageUrl: string | null = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.startsWith('http')) {
      imageUrl = ogImage;
    } else {
      const articleImg = $('article img, .detail-text img, .article-content img').first().attr('src');
      if (articleImg && articleImg.startsWith('http')) imageUrl = articleImg;
    }

    return { content: bodyText, excerpt, imageUrl };
  } catch {
    return { content: '', excerpt: '', imageUrl: null };
  }
}

export async function fetchAllPopular(): Promise<PopularArticle[]> {
  const results = await Promise.allSettled([
    fetchFromKompas(),
    fetchFromLiputan6(),
    fetchFromAntara(),
    fetchFromSindonews(),
    fetchFromDetik(),
  ]);

  const all: PopularArticle[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const r of results) {
    if (r.status === 'fulfilled') {
      all.push(...r.value);
      for (const a of r.value) {
        sourceCounts[a.sourceName] = (sourceCounts[a.sourceName] || 0) + 1;
      }
    }
  }

  console.log('Popular sources:', JSON.stringify(sourceCounts));
  console.log('Total popular articles:', all.length);

  // Dedup by title similarity across sources
  const deduped: PopularArticle[] = [];
  for (const article of all) {
    const isDupe = deduped.some(
      (existing) => titleSimilarity(article.title, existing.title) >= 0.35
    );
    if (!isDupe) deduped.push(article);
  }

  console.log('After cross-source dedup:', deduped.length);

  // Fetch konten dari URL asli untuk artikel teratas (max 10 untuk efisiensi)
  const toEnrich = deduped.slice(0, 10);
  console.log(`Fetching content for top ${toEnrich.length} articles...`);

  // Fetch berurutan untuk hindari rate limit
  const result: PopularArticle[] = [];
  for (const article of toEnrich) {
    const { content, excerpt, imageUrl } = await fetchArticleContent(article.link);
    result.push({
      ...article,
      content: content || article.title,
      excerpt: excerpt || article.title,
      imageUrl: imageUrl || article.imageUrl,
    });
  }

  // Tambah sisa artikel tanpa konten (akan di-skip oleh rewrite jika terlalu pendek)
  result.push(...deduped.slice(10));

  console.log(`Enriched ${result.filter(a => (a.content || '').length > 100).length} articles with content`);
  return result;
}

// Quick title similarity (same logic as title-dedup.ts)
function titleSimilarity(a: string, b: string): number {
  const STOP = new Set(['yang', 'di', 'dan', 'ini', 'itu', 'dengan', 'untuk', 'pada',
    'ke', 'dari', 'ada', 'juga', 'akan', 'sudah', 'tidak', 'bisa', 'oleh', 'sebagai',
    'dalam', 'adalah', 'tersebut', 'lebih', 'karena', 'belum', 'atau', 'kini',
    'the', 'of', 'in', 'to', 'and', 'a', 'is', 'for', 'on', 'with', 'by', 'at',
    'this', 'that', 'from', 'been', 'have', 'has', 'had', 'were', 'was', 'are',
    'berita', 'terbaru', 'update', 'hari', 'ini', 'kabar', 'resmi']);

  const wordsA = a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w));
  const wordsB = b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w));

  if (wordsA.length < 2 || wordsB.length < 2) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let matches = 0;
  for (const w of setA) { if (setB.has(w)) matches++; }

  const wordScore = matches / Math.min(setA.size, setB.size);

  // Number match bonus
  const numsA = a.match(/\d[\d.,]*\d|\d/g) || [] as string[];
  const numsB = b.match(/\d[\d.,]*\d|\d/g) || [] as string[];
  const numMatches = numsA.filter(n => numsB.includes(n)).length;
  const numBonus = numMatches > 0 ? 0.15 : 0;

  return Math.min(wordScore + numBonus, 1.0);
}
