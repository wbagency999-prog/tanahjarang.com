// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita dari RSS feed media mainstream
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';
import { RSS_FEEDS, FILTER_KEYWORDS } from '@/lib/rss-feeds';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Warta Nusantara RSS Reader/1.0',
  },
});

interface FetchedArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  sourceName: string;
  category: string;
  guid: string;
}

// Cek apakah artikel sudah ada di Sanity
async function isArticleExists(link: string): Promise<boolean> {
  const count = await client.fetch<number>(
    `count(*[_type == "post" && originalUrl == $url] + *[_type == "drafts.post" && originalUrl == $url])`,
    { url: link }
  );
  return count > 0;
}

// Cek apakah artikel mengandung kata kunci yang dihindari
function shouldExclude(title: string, content: string): boolean {
  const text = (title + ' ' + content).toLowerCase();
  return FILTER_KEYWORDS.exclude.some((keyword) => text.includes(keyword.toLowerCase()));
}

// Fetch satu RSS feed
async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<FetchedArticle[]> {
  try {
    const feedData = await parser.parseURL(feed.url);
    const articles: FetchedArticle[] = [];

    for (const item of feedData.items || []) {
      if (!item.title || !item.link) continue;

      // Skip jika artikel sudah ada
      if (await isArticleExists(item.link)) continue;

      // Skip jika konten tidak layak
      const content = item.contentSnippet || item.content || item.content || '';
      if (shouldExclude(item.title, content)) continue;

      articles.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: content,
        contentSnippet: content.substring(0, 200),
        sourceName: feed.name,
        category: feed.category,
        guid: item.guid || item.link,
      });
    }

    return articles;
  } catch (error: any) {
    console.error(`Error fetching ${feed.name}:`, error.message);
    return [];
  }
}

// Simpan artikel ke Sanity sebagai draft
async function saveToSanity(article: FetchedArticle): Promise<string | null> {
  try {
    const doc = {
      _type: 'post',
      title: article.title,
      slug: {
        _type: 'slug',
        current: generateSlug(article.title),
      },
      excerpt: article.contentSnippet,
      body: [
        {
          _type: 'block',
          _key: 'intro',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'intro-text',
              text: article.content,
            },
          ],
          markDefs: [],
        },
      ],
      publishedAt: new Date(article.pubDate).toISOString(),
      originalUrl: article.link,
      sourceName: article.sourceName,
      pipelineStatus: 'pending-review',
      tags: [],
      views: 0,
      aiDisclosure: false,
    };

    const result = await writeClient.create(doc);
    return result._id;
  } catch (error: any) {
    console.error('Error saving to Sanity:', error.message);
    return null;
  }
}

// Generate slug dari judul
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');
  const logs: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  logs.push(`Starting RSS fetch at ${new Date().toISOString()}`);

  // Fetch dari semua feed yang enabled
  const enabledFeeds = RSS_FEEDS.filter((f) => f.enabled);

  for (const feed of enabledFeeds.slice(0, limit)) {
    logs.push(`Fetching: ${feed.name}...`);
    const articles = await fetchFeed(feed);
    logs.push(`Found ${articles.length} new articles from ${feed.name}`);

    for (const article of articles) {
      const saved = await saveToSanity(article);
      if (saved) {
        totalSaved++;
        logs.push(`  ✓ Saved: ${article.title.substring(0, 50)}...`);
      }
      totalFetched++;
    }
  }

  logs.push(`\nDone! Fetched: ${totalFetched}, Saved: ${totalSaved}`);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalFetched,
    totalSaved,
    logs,
  });
}
