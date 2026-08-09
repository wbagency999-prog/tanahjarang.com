// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita dari RSS feed
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';
import { RSS_FEEDS, FILTER_KEYWORDS } from '@/lib/rss-feeds';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; WartaBot/1.0)',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
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

// Extract gambar dari content HTML
function extractImageFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

// Ambil gambar dari item RSS
function getRSSImage(item: any): string | null {
  // Cek media:content
  if (item.mediaContent && item.mediaContent.$) {
    return item.mediaContent.$.url || null;
  }
  // Cek media:thumbnail
  if (item.mediaThumbnail && item.mediaThumbnail.$) {
    return item.mediaThumbnail.$.url || null;
  }
  // Cek enclosure
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  // Cek enclosureLength (bisa jadi array)
  if (Array.isArray(item.enclosure)) {
    for (const enc of item.enclosure) {
      if (enc.url) return enc.url;
    }
  }
  return null;
}

// Fetch RSS feed
async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<FetchedArticle[]> {
  try {
    const feedData = await parser.parseURL(feed.url);
    const articles: FetchedArticle[] = [];

    for (const item of feedData.items || []) {
      if (!item.title || !item.link) continue;
      if (await isArticleExists(item.link)) continue;

      // Get content - full HTML atau snippet
      const rawContent = (item as any)['content:encoded'] || item.content || item.contentSnippet || '';
      if (shouldExclude(item.title, rawContent)) continue;

      // Bersihkan HTML tags untuk text
      const cleanText = rawContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Get image
      let imageUrl = getRSSImage(item);
      if (!imageUrl) {
        imageUrl = extractImageFromHtml(rawContent);
      }

      // Absolutkan URL
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          imageUrl = new URL(imageUrl, item.link).href;
        } catch {
          imageUrl = null;
        }
      }

      articles.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: cleanText,
        excerpt: cleanText.substring(0, 200),
        imageUrl,
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

// Upload gambar ke Sanity
async function uploadImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return null; // Skip gambar terlalu kecil

    const asset = await writeClient.assets.upload('image', buffer, {
      filename: `article-${Date.now()}.jpg`,
    });
    return asset._id;
  } catch {
    return null;
  }
}

// Convert text ke Portable Text blocks
function textToBlocks(text: string): any[] {
  return text.split(/\n\n+/).filter(Boolean).map((p, i) => ({
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
    // Upload gambar - WAJIB
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

    // Skip jika tidak ada gambar
    if (!mainImage) {
      console.log('Skipping article without image:', article.title);
      return null;
    }

    const slug = generateSlug(article.title);
    const excerpt = article.excerpt || article.content.substring(0, 200);
    const metaDesc = excerpt.substring(0, 160);
    const seoTitle = article.title.substring(0, 70); // Max 70 karakter

    const doc: any = {
      _type: 'post',
      title: article.title,
      slug: { _type: 'slug', current: slug },
      subtitle: article.title,
      excerpt: excerpt,
      body: textToBlocks(article.content),
      mainImage: mainImage,
      publishedAt: new Date(article.pubDate).toISOString(),
      originalUrl: article.link,
      sourceName: article.sourceName,
      pipelineStatus: 'pending-review',
      tags: [],
      views: 0,
      aiDisclosure: false,
      metaDescription: metaDesc,
      metaTitle: seoTitle,
      seoTitle: seoTitle,
      seoDescription: metaDesc,
      imageCaption: article.sourceName,
      tableOfContent: false,
      amp: false,
      komentarPembaca: true, // Selalu aktif
    };

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
        const hasImg = article.imageUrl ? '📷' : '  ';
        logs.push(`  ${hasImg} ${article.title.substring(0, 55)}`);
      }
      totalFetched++;
    }
  }

  logs.push(`\nDone! ${totalFetched} fetched, ${totalSaved} saved`);

  return NextResponse.json({
    success: true,
    totalFetched,
    totalSaved,
    logs,
  });
}
