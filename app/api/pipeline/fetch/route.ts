// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita dari RSS feed
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';
import { RSS_FEEDS, FILTER_KEYWORDS } from '@/lib/rss-feeds';
import { rewriteArticle, type RewriteResult } from '@/lib/ai-rewriter';

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

    const asset = await writeClient.assets.upload('image', buffer, {
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

async function saveToSanity(article: FetchedArticle): Promise<string | null> {
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
      return null;
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

    // AI Rewrite
    let rewritten: RewriteResult | null = null;
    try {
      rewritten = await rewriteArticle(
        article.title,
        article.content,
        article.sourceName,
        article.category
      );
    } catch (e: any) {
      console.log('AI rewrite failed, using original:', e.message);
    }

    // Build document dari hasil rewrite atau original
    const title = rewritten?.title || article.title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100);
    const body = rewritten?.body ? textToBlocks(rewritten.body) : textToBlocks(article.content);
    const excerpt = rewritten?.excerpt || article.excerpt || article.content.substring(0, 200);
    const metaDesc = (rewritten?.metaDescription || excerpt).substring(0, 160);
    const seoTitle = (rewritten?.seoTitle || title).substring(0, 60);

    const doc: any = {
      _type: 'post',
      title,
      slug: { _type: 'slug', current: slug },
      subtitle: (rewritten?.subtitle || title).substring(0, 120),
      excerpt,
      body,
      mainImage: {
        ...mainImage,
        alt: rewritten?.mainImageAlt || title.substring(0, 125),
      },
      publishedAt: new Date(article.pubDate).toISOString(),
      originalUrl: article.link,
      sourceName: article.sourceName,
      pipelineStatus: 'pending-review',
      tags: rewritten?.tags || [],
      views: 0,
      aiDisclosure: true,
      aiRewritten: !!rewritten,
      komentarPembaca: true,
      amp: false,
      tableOfContent: true,
      metaDescription: metaDesc,
      metaTitle: seoTitle,
      focusKeyphrase: rewritten?.focusKeyphrase || '',
      seo: {
        seoTitle,
        seoDescription: metaDesc,
        ogDescription: rewritten?.ogDescription || excerpt.substring(0, 200),
      },
      imageCaption: `${title} | Foto: ${article.sourceName}`,
      author: { _type: 'reference' as const, _ref: authorRef },
      categories: [{ _type: 'reference' as const, _ref: catId, _key: `cat-${catId}` }],
      // Analisis AI
      factCheckScore: rewritten?.analysis?.factCheckScore ?? null,
      ethicsScore: rewritten?.analysis?.ethicsScore ?? null,
      originalityScore: rewritten?.analysis?.originalityScore ?? null,
      plagiarismScore: rewritten?.analysis?.plagiarismScore ?? null,
      sourceAttributions: rewritten?.analysis?.sourceAttributions || [],
      verifiedFacts: rewritten?.analysis?.verifiedFacts || [],
      aiMetadata: rewritten ? {
        model: 'claude-sonnet-5-20250514',
        rewrittenAt: new Date().toISOString(),
        originalTitle: article.title,
      } : undefined,
    };

    const docId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const result = await writeClient.createIfNotExists({
      _id: `drafts.${docId}`,
      ...doc,
    });
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

  const enabledFeeds = RSS_FEEDS.filter((f) => f.enabled);
  const feedLimit = parseInt(request.nextUrl.searchParams.get('feeds') || '1');
  const articleLimit = parseInt(request.nextUrl.searchParams.get('limit') || '3');
  const logs: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  logs.push(`Starting fetch at ${new Date().toISOString()}`);
  logs.push(`Limits: ${feedLimit} feed(s), ${articleLimit} article(s) per feed`);

  for (const feed of enabledFeeds.slice(0, feedLimit)) {
    logs.push(`\nFetching: ${feed.name}...`);
    const articles = await fetchFeed(feed);
    const toProcess = articles.slice(0, articleLimit);
    logs.push(`Found ${articles.length} new, processing ${toProcess.length}`);

    for (const article of toProcess) {
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
