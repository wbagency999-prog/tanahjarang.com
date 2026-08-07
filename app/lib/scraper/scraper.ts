// ═══════════════════════════════════════════════════════════
//  UNIVERSAL SCRAPER — RSS + Web Crawling (Improved)
//  - Paralel scraping dengan Promise.allSettled
//  - Retry mechanism (2x)
//  - Per-source content selectors
//  - OG image fallback
// ═══════════════════════════════════════════════════════════

import * as cheerio from 'cheerio'
import type { FeedSource } from './sources'

// ═══════════════════════════════════════════════════════════
//  RSS CACHE — Hindari re-fetch dalam 15 menit
// ═══════════════════════════════════════════════════════════

interface CacheEntry {
  data: ScrapedArticle[]
  timestamp: number
}

const rssCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 menit

function getCachedRSS(sourceName: string): ScrapedArticle[] | null {
  const entry = rssCache.get(sourceName)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rssCache.delete(sourceName)
    return null
  }
  console.log(`[Cache] ${sourceName}: menggunakan cache (${entry.data.length} artikel)`)
  return entry.data
}

function setCachedRSS(sourceName: string, articles: ScrapedArticle[]): void {
  rssCache.set(sourceName, { data: articles, timestamp: Date.now() })
}

export interface ScrapedArticle {
  title: string
  link: string
  description: string
  content: string
  imageUrl: string | null
  pubDate: string
  sourceName: string
  category: string
}

export interface FullContentResult {
  content: string
  ogImage: string | null
}

// ═══════════════════════════════════════════════════════════
//  RETRY HELPER
// ═══════════════════════════════════════════════════════════

async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  retries: number = 2
): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(options.timeout || 15000),
      })
      if (res.ok) return res
      if (res.status < 500) {
        console.warn(`[Scraper] ${url}: HTTP ${res.status} (no retry)`)
        return null
      }
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`[Scraper] ${url}: Failed after ${retries + 1} attempts — ${error.message}`)
        return null
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════
//  RSS PARSER
// ═══════════════════════════════════════════════════════════

export async function scrapeRSS(
  source: FeedSource,
  limit: number = 5
): Promise<ScrapedArticle[]> {
  // Check cache dulu
  const cached = getCachedRSS(source.name)
  if (cached) return cached.slice(0, limit)

  try {
    const res = await fetchWithRetry(source.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    })

    if (!res) {
      console.warn(`[Scraper] ${source.name}: Gagal fetch RSS`)
      return []
    }

    const text = await res.text()
    const articles: ScrapedArticle[] = []

    const itemMatches =
      text.match(/<item[\s>][\s\S]*?<\/item>/gi) ||
      text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ||
      []

    for (const item of itemMatches.slice(0, limit)) {
      const title = extractXMLValue(item, 'title')
      const link =
        extractXMLValue(item, 'link') ||
        extractXMLAttr(item, 'link', 'href') ||
        extractXMLValue(item, 'url')
      const description = extractXMLValue(item, 'description') || extractXMLValue(item, 'summary')
      const pubDate = extractXMLValue(item, 'pubDate') || extractXMLValue(item, 'published') || extractXMLValue(item, 'updated')
      const contentEncoded =
        extractXMLValue(item, 'content:encoded') ||
        extractXMLValue(item, 'content')

      const imageUrl = extractImage(item, description || contentEncoded || '')

      if (title && link) {
        const article: ScrapedArticle = {
          title: cleanHTML(title).trim(),
          link: resolveLink(link.trim()),
          description: cleanHTML(description || '').trim().substring(0, 500),
          content: cleanHTML(contentEncoded || description || '').trim(),
          imageUrl,
          pubDate: pubDate || new Date().toISOString(),
          sourceName: source.name,
          category: source.category,
        }

        if (article.content.length > 50 || article.description.length > 50) {
          articles.push(article)
        }
      }
    }

    if (articles.length > 0) {
      console.log(`[Scraper] ${source.name}: ${articles.length} artikel`)
      setCachedRSS(source.name, articles)
    }

    return articles
  } catch (error: any) {
    console.error(`[Scraper] Error scraping ${source.name}:`, error.message)
    return []
  }
}

export async function scrapeAllSources(
  sources: FeedSource[],
  limitPerSource: number = 3
): Promise<ScrapedArticle[]> {
  const results = await Promise.allSettled(
    sources.map((source) => scrapeRSS(source, limitPerSource))
  )

  const allArticles: ScrapedArticle[] = []
  let successCount = 0
  let failCount = 0

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allArticles.push(...result.value)
      successCount++
    } else {
      failCount++
    }
  }

  console.log(`[Scraper] Selesai: ${successCount} sumber berhasil, ${failCount} gagal, total ${allArticles.length} artikel`)
  return allArticles
}

// ═══════════════════════════════════════════════════════════
//  FETCH FULL CONTENT + OG IMAGE
// ═══════════════════════════════════════════════════════════

export async function fetchFullContent(
  url: string,
  contentSelector?: string
): Promise<FullContentResult> {
  try {
    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    })

    if (!res) return { content: '', ogImage: null }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Ekstrak OG image sebagai fallback untuk artikel tanpa foto
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') ||
      null

    // Hapus elemen noise
    $(
      'script, style, nav, header, footer, aside, ' +
      '.ads, .advertisement, .social-share, .related-articles, .comments, ' +
      '.sidebar, .breadcrumb, .tag-list, .share-buttons, .promo, ' +
      '.pilihan-redaksi, .baca-juga, .berita-terkait, .artikel-terkait, ' +
      '[class*="promo"], [class*="iklan"], [class*="banner"], ' +
      '[class*="sidebar"], [class*="share"], [class*="social"], ' +
      '[class*="related"], [class*="recommend"], [class*="footer"], ' +
      '[class*="comment"], [class*="rating"], [id*="banner"], [id*="iklan"], ' +
      '[class*="widget"], [class*="bottom-"], ' +
      '[class*="top-"], [class*="populer"], [class*="terpopuler"]'
    ).remove()

    // 1. Per-source selector
    if (contentSelector) {
      const el = $(contentSelector).first()
      if (el.length) {
        const content = cleanContent(el.text().trim())
        if (content && content.length > 100) {
          return { content: content.substring(0, 5000), ogImage }
        }
      }
    }

    // 2. Selector umum
    const contentSelectors = [
      '.article-body', '.detail-text', '.read__content',
      '.detail_content', '.detail-content', '.article-content',
      '.post-content', '.entry-content', '.news-content', '.text-content',
      'article .content', 'article', '[role="main"]', 'main',
    ]

    for (const selector of contentSelectors) {
      const el = $(selector).first()
      if (el.length) {
        const content = cleanContent(el.text().trim())
        if (content && content.length > 100) {
          return { content: content.substring(0, 5000), ogImage }
        }
      }
    }

    // 3. Fallback
    const bodyText = cleanContent($('body').text().trim())
    return { content: bodyText.substring(0, 5000), ogImage }
  } catch (error: any) {
    console.error(`[Scraper] Error fetching ${url}:`, error.message)
    return { content: '', ogImage: null }
  }
}

// ═══════════════════════════════════════════════════════════
//  XML HELPERS
// ═══════════════════════════════════════════════════════════

function extractXMLValue(xml: string, tag: string): string {
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i')
  )
  if (cdataMatch) return cdataMatch[1]

  const tagMatch = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  )
  if (tagMatch) return tagMatch[1]

  const selfMatch = xml.match(
    new RegExp(`<${tag}[^>]*>([^<]*)`, 'i')
  )
  if (selfMatch && !selfMatch[1].startsWith('<')) return selfMatch[1]

  return ''
}

function extractXMLAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, 'i')
  )
  return match ? match[1] : ''
}

function extractImage(itemXml: string, contentText: string): string | null {
  const patterns = [
    /<media:content[^>]*url="([^"]+)"/i,
    /<media:content[^>]*src="([^"]+)"/i,
    /<enclosure[^>]*url="([^"]+)"/i,
    /<media:thumbnail[^>]*url="([^"]+)"/i,
    /<image[^>]*url="([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = itemXml.match(pattern)
    if (match) return match[1]
  }

  const imgMatch = contentText.match(/<img[^>]*src="([^"]+)"/i)
  if (imgMatch) return imgMatch[1]

  return null
}

function resolveLink(link: string): string {
  if (link.startsWith('http')) return link
  return link
}

// ═══════════════════════════════════════════════════════════
//  CONTENT CLEANUP
// ═══════════════════════════════════════════════════════════

function cleanHTML(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanContent(text: string): string {
  let cleaned = text

  const junkPatterns = [
    /ADVERTISEMENT/gi,
    /SCROLL TO CONTINUE WITH CONTENT/gi,
    /Pilihan Redaksi[\s\S]*$/gi,
    /Baca Juga[\s\S]*$/gi,
    /Baca juga[\s\S]*$/gi,
    /Berita Terkait[\s\S]*$/gi,
    /Artikel Terkait[\s\S]*$/gi,
    /Lihat Juga[\s\S]*$/gi,
    /Video Terkait[\s\S]*$/gi,
    /Editor.?s Pick[\s\S]*$/gi,
    /Share[\s\S]*$/gi,
    /Kirimkan[\s\S]*$/gi,
    /Artikel ini telah tayang di[\s\S]*$/gi,
    /Baca di sini[\s\S]*$/gi,
    /Source :[\s\S]*$/gi,
    /Sumber:[\s\S]*$/gi,
    /\[Gambas[^\]]*\]/gi,
    /\(ikw\/[\w\/]+\)/gi,
    /\([\w\/]+\/[\w\/]+\/[\w\/]+\)/gi,
    /\(Bersambung\)/gi,
    /NEXT PAGE/gi,
    /PREVIOUS PAGE/gi,
    /Halaman Selanjutnya/gi,
    /Halaman Sebelumnya/gi,
    /^Tags:.*$/gim,
    /^TAGS:.*$/gim,
    /^Label:.*$/gim,
    /^Kategori:.*$/gim,
  ]

  for (const pattern of junkPatterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  return cleaned
}
