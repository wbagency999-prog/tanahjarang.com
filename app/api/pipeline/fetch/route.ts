// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita dari RSS feed + scrape full content
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';
import { RSS_FEEDS, FILTER_KEYWORDS } from '@/lib/rss-feeds';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; WartaBot/1.0)',
  },
});

interface FetchedArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  excerpt: string;
  imageUrl: string | null;
  sourceName: string;
  category: string;
}

// Cek apakah artikel sudah ada
async function isArticleExists(link: string): Promise<boolean> {
  const count = await client.fetch<number>(
    `count(*[_type == "post" && originalUrl == $url])`,
    { url: link }
  );
  return count > 0;
}

// Filter konten tidak layak
function shouldExclude(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();
  return FILTER_KEYWORDS.exclude.some((kw) => text.includes(kw.toLowerCase()));
}

// Scrape full article dari URL
async function scrapeArticle(url: string): Promise<{ content: string; imageUrl: string | null } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WartaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Hapus script, style, nav, footer, sidebar, iklan
    $('script, style, nav, footer, aside, .ad, .advertisement, .sidebar, .related, .comment').remove();

    // Cari konten artikel - multiple selector
    let contentEl = $('article').first();
    if (!contentEl.length) contentEl = $('.article-content, .content-article, .post-content, .entry-content, .news-content, .detail-content').first();
    if (!contentEl.length) contentEl = $('.detail_body, .article_body, .content_body').first();

    // Extract paragraphs
    const paragraphs: string[] = [];
    contentEl.find('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) { // Skip paragraf pendek
        paragraphs.push(text);
      }
    });

    // Extract gambar
    let imageUrl: string | null = null;
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      imageUrl = ogImage;
    } else {
      const firstImg = contentEl.find('img').first().attr('src');
      if (firstImg) imageUrl = firstImg;
    }

    // Absolutkan URL gambar
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch {
        imageUrl = null;
      }
    }

    return {
      content: paragraphs.join('\n\n'),
      imageUrl,
    };
  } catch (error: any) {
    console.error(`Scrape error for ${url}:`, error.message);
    return null;
  }
}

// Upload gambar ke Sanity
async function uploadImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const asset = await writeClient.assets.upload('image', buffer, {
      filename: `article-${Date.now()}.jpg`,
    });
    return asset._id;
  } catch (error: any) {
    console.error('Image upload error:', error.message);
    return null;
  }
}

// Fetch RSS feed
async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<FetchedArticle[]> {
  try {
    const feedData = await parser.parseURL(feed.url);
    const articles: FetchedArticle[] = [];

    for (const item of feedData.items || []) {
      if (!item.title || !item.link) continue;
      if (await isArticleExists(item.link)) continue;

      const snippet = item.contentSnippet || item.content || '';
      if (shouldExclude(item.title, snippet)) continue;

      // Scrape full article
      const scraped = await scrapeArticle(item.link);

      articles.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: scraped?.content || snippet,
        excerpt: (scraped?.content || snippet).substring(0, 200),
        imageUrl: scraped?.imageUrl || null,
        sourceName: feed.name,
        category: feed.category,
      });
    }

    return articles;
  } catch (error: any) {
    console.error(`Error fetching ${feed.name}:`, error.message);
    return [];
  }
}

// Convert text ke Portable Text blocks
function textToBlocks(text: string): any[] {
  return text.split('\n\n').filter(Boolean).map((p, i) => ({
    _type: 'block',
    _key: `body-${i}`,
    style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: p.trim() }],
    markDefs: [],
  }));
}

// Generate slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// Simpan ke Sanity
async function saveToSanity(article: FetchedArticle): Promise<string | null> {
  try {
    // Upload gambar jika ada
    let mainImage: any = undefined;
    if (article.imageUrl) {
      const assetId = await uploadImage(article.imageUrl);
      if (assetId) {
        mainImage = {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
        };
      }
    }

    const doc: any = {
      _type: 'post',
      title: article.title,
      slug: { _type: 'slug', current: generateSlug(article.title) },
      excerpt: article.excerpt,
      body: textToBlocks(article.content),
      publishedAt: new Date(article.pubDate).toISOString(),
      originalUrl: article.link,
      sourceName: article.sourceName,
      pipelineStatus: 'pending-review',
      tags: [],
      views: 0,
      aiDisclosure: false,
    };

    if (mainImage) {
      doc.mainImage = mainImage;
    }

    const result = await writeClient.create(doc);
    return result._id;
  } catch (error: any) {
    console.error('Error saving:', error.message);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '3');
  const logs: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  logs.push(`Starting fetch at ${new Date().toISOString()}`);

  const enabledFeeds = RSS_FEEDS.filter((f) => f.enabled);

  for (const feed of enabledFeeds.slice(0, limit)) {
    logs.push(`\nFetching: ${feed.name}...`);
    const articles = await fetchFeed(feed);
    logs.push(`Found ${articles.length} new articles`);

    for (const article of articles) {
      const saved = await saveToSanity(article);
      if (saved) {
        totalSaved++;
        logs.push(`  ✓ ${article.title.substring(0, 60)}`);
      }
      totalFetched++;
    }
  }

  logs.push(`\nDone! Total: ${totalFetched} fetched, ${totalSaved} saved`);

  return NextResponse.json({
    success: true,
    totalFetched,
    totalSaved,
    logs,
  });
}
