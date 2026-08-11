// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita dari RSS feed
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { getWriteClient } from '@/sanity/writeClient';
import { RSS_FEEDS, FILTER_KEYWORDS } from '@/lib/rss-feeds';
import { isSimilarTitle } from '@/lib/title-dedup';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

const PIPELINE_STATUSES = ['published', 'ready-for-review', 'pending-review'] as const;

// Fast dedup: cek judul mirip di post pipeline (termasuk draft — butuh write client)
async function isSimilarTitleExists(title: string): Promise<boolean> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await getWriteClient().fetch<{ title: string }[]>(
    `*[_type == "post" && pipelineStatus in $statuses && publishedAt > $dayAgo] | order(publishedAt desc)[0...50]{ title }`,
    { dayAgo, statuses: PIPELINE_STATUSES }
  );

  return isSimilarTitle(title, recent.map((post) => post.title));
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

// Fetch RSS feed - batch check URL existence
async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<FetchedArticle[]> {
  try {
    const feedData = await parser.parseURL(feed.url);

    // Batch: ambil semua URLs sekaligus
    const items = (feedData.items || []).filter(item => item.title && item.link) as { title: string; link: string; [key: string]: any }[];
    if (items.length === 0) return [];

    const urls = items.map(item => item.link);

    // Fetch existing originalUrls (termasuk draft) untuk dedup
    const existingUrls = await getWriteClient().fetch<string[]>(
      `*[_type == "post" && defined(originalUrl) && pipelineStatus in $statuses && originalUrl in $urls].originalUrl`,
      { urls, statuses: PIPELINE_STATUSES }
    );
    const existingSet = new Set(existingUrls);

    const articles: FetchedArticle[] = [];

    for (const item of items) {
      if (existingSet.has(item.link)) continue;

      // Get content - full HTML atau snippet
      const rawContent = (item as any)['content:encoded'] || item.content || item.contentSnippet || '';
      if (shouldExclude(item.title, rawContent)) continue;

      // Bersihkan HTML tags untuk text
      let cleanText = rawContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
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

    const asset = await getWriteClient().assets.upload('image', buffer, {
      filename: `article-${Date.now()}.jpg`,
    });
    return asset._id;
  } catch {
    return null;
  }
}

// Simpan ke Sanity + AI Rewrite
function textToBlocks(text: string): any[] {
  return text.split(/\n\n+/).filter(Boolean).map((p, i) => ({
    _type: 'block',
    _key: `body-${i}`,
    style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: p.trim() }],
    markDefs: [],
  }));
}

async function saveToSanity(article: FetchedArticle, logs: string[]): Promise<{ id: string | null; error: string | null }> {
  try {
    // Upload gambar
    let mainImage: any = undefined;
    if (article.imageUrl) {
      const assetId = await uploadImage(article.imageUrl);
      if (assetId) {
        mainImage = {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId },
          alt: article.title.substring(0, 125),
        };
      }
    }

    if (!mainImage) {
      console.log('Skipping article without image:', article.title);
      return { id: null, error: 'No image' };
    }

    // Category & Author mapping
    const categoryMap: Record<string, string> = {
      nasional: 'kF0pH8zAeRz6etg9XEHvmR',
      internasional: 'vG7OWidh2JKCGmChuCBMZo',
      teknologi: '4jdLeV61fwp22DXUjLo4vy',
      olahraga: '4jdLeV61fwp22DXUjLo5kM',
      hiburan: 'kF0pH8zAeRz6etg9XEHw11',
      bisnis: 'a89c1f1f-b021-4604-9214-2b9e9ef097c8',
      pendidikan: 'vG7OWidh2JKCGmChuCBMmJ',
      otomotif: 'c669d085-a81e-45ac-8057-12a955e6e20a',
    };
    const authorMap: Record<string, string> = {
      nasional: 'Z7sgg6YupGd2FS20j7fQ5s',
      internasional: 'Z7sgg6YupGd2FS20j9M4S6',
      teknologi: '11XvD3mq7HlIxXJq9S3Snm',
      olahraga: '11XvD3mq7HlIxXJq9S3P58',
      hiburan: '11XvD3mq7HlIxXJq9S3QIX',
      bisnis: '11XvD3mq7HlIxXJq9S3NDo',
      pendidikan: 'Z7sgg6YupGd2FS20j9M2vL',
      otomotif: '11XvD3mq7HlIxXJq9S3TRh',
    };
    const catKey = article.category.toLowerCase();
    const catId = categoryMap[catKey] || categoryMap.nasional;
    const authorRef = authorMap[catKey] || authorMap.nasional;

    // Simpan mentah — AI rewrite dilakukan di endpoint terpisah
    const title = article.title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100);
    const body = textToBlocks(article.content);
    const excerpt = article.excerpt || article.content.substring(0, 200);
    const metaDesc = excerpt.substring(0, 160);
    const seoTitle = title.substring(0, 60);

    const doc: any = {
      _type: 'post',
      title,
      slug: { _type: 'slug', current: slug },
      subtitle: title.substring(0, 120),
      excerpt,
      body,
      mainImage: {
        ...mainImage,
        alt: title.substring(0, 125),
      },
      publishedAt: new Date(article.pubDate).toISOString(),
      originalUrl: article.link,
      sourceName: article.sourceName,
      pipelineStatus: 'pending-review',
      tags: [],
      views: 0,
      aiDisclosure: true,
      aiRewritten: false,
      komentarPembaca: true,
      amp: false,
      tableOfContent: true,
      metaDescription: metaDesc,
      metaTitle: seoTitle,
      focusKeyphrase: '',
      seo: {
        seoTitle,
        seoDescription: metaDesc,
        ogDescription: excerpt.substring(0, 200),
      },
      imageCaption: `${title} | Foto: ${article.sourceName}`,
      author: { _type: 'reference' as const, _ref: authorRef },
      categories: [{ _type: 'reference' as const, _ref: catId, _key: `cat-${catId}` }],
    };

    const docId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      const result = await getWriteClient().create({
        _id: `drafts.${docId}`,
        ...doc,
      });
      return { id: result._id, error: null };
    } catch (err: any) {
      console.error('Create error:', err.message, err.response?.body ? JSON.stringify(err.response.body).substring(0, 300) : '');
      return { id: null, error: err.message };
    }
  } catch (error: any) {
    console.error('Error saving:', error.message);
    return { id: null, error: error.message };
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabledFeeds = RSS_FEEDS.filter((f) => f.enabled);
  const feedLimit = parseInt(request.nextUrl.searchParams.get('feeds') || '1');
  const articleLimit = parseInt(request.nextUrl.searchParams.get('limit') || '1');
  const logs: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  logs.push(`Starting fetch at ${new Date().toISOString()}`);
  logs.push(`Limits: ${feedLimit} feed(s), ${articleLimit} article(s) per feed`);

  // In-memory dedup: track titles saved in this batch to catch duplicates across feeds
  const savedTitles: string[] = [];

  for (const feed of enabledFeeds.slice(0, feedLimit)) {
    logs.push(`\nFetching: ${feed.name}...`);
    const articles = await fetchFeed(feed);
    const toProcess = articles.slice(0, articleLimit);
    logs.push(`Found ${articles.length} new, processing ${toProcess.length}`);

    for (const article of toProcess) {
      // Dedup: skip artikel dengan judul mirip (check Sanity + in-memory batch)
      if (await isSimilarTitleExists(article.title) || isSimilarTitle(article.title, savedTitles)) {
        logs.push(`  ⏭ Skip duplikat: ${article.title.substring(0, 55)}`);
        totalFetched++;
        continue;
      }

      const result = await saveToSanity(article, logs);
      if (result.id) {
        totalSaved++;
        savedTitles.push(article.title);
        const hasImg = article.imageUrl ? '📷' : '  ';
        logs.push(`  ${hasImg} ${article.title.substring(0, 55)}`);
        // Verify: try to read back
        try {
          const readBack = await getWriteClient().getDocument(result.id);
          logs.push(`  Verify: ${readBack ? 'FOUND' : 'NOT FOUND'} (${result.id})`);
        } catch (e: any) {
          logs.push(`  Verify error: ${e.message}`);
        }
      }
      if (result.error) {
        logs.push(`  ✗ Save error: ${result.error}`);
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
