// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita terpopuler dari situs berita Indonesia
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';
import { shouldExclude } from '@/lib/content-filters';
import { isSimilarTitle } from '@/lib/title-dedup';
import { aiDeduplicate } from '@/lib/ai-dedup';
import { fetchAllPopular, type PopularArticle } from '@/lib/popular-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PIPELINE_STATUSES = ['published', 'ready-for-review', 'pending-review'] as const;

// Category & Author mapping ke Sanity document IDs
const CATEGORY_MAP: Record<string, string> = {
  nasional: 'kF0pH8zAeRz6etg9XEHvmR',
  internasional: 'vG7OWidh2JKCGmChuCBMZo',
  teknologi: '4jdLeV61fwp22DXUjLo4vy',
  olahraga: '4jdLeV61fwp22DXUjLo5kM',
  hiburan: 'kF0pH8zAeRz6etg9XEHw11',
  bisnis: 'a89c1f1f-b021-4604-9214-2b9e9ef097c8',
  pendidikan: 'vG7OWidh2JKCGmChuCBMmJ',
  otomotif: 'c669d085-a81e-45ac-8057-12a955e6e20a',
};

const AUTHOR_MAP: Record<string, string> = {
  nasional: 'Z7sgg6YupGd2FS20j7fQ5s',
  internasional: 'Z7sgg6YupGd2FS20j9M4S6',
  teknologi: '11XvD3mq7HlIxXJq9S3Snm',
  olahraga: '11XvD3mq7HlIxXJq9S3P58',
  hiburan: '11XvD3mq7HlIxXJq9S3QIX',
  bisnis: '11XvD3mq7HlIxXJq9S3NDo',
  pendidikan: 'Z7sgg6YupGd2FS20j9M2vL',
  otomotif: '11XvD3mq7HlIxXJq9S3TRh',
};

// Fetch semua judul recent dari Sanity (sekali saja, bukan per artikel)
async function fetchRecentTitles(): Promise<string[]> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await getWriteClient().fetch<{ title: string }[]>(
    `*[_type == "post" && pipelineStatus in $statuses && publishedAt > $dayAgo] | order(publishedAt desc)[0...100]{ title }`,
    { dayAgo, statuses: PIPELINE_STATUSES }
  );
  return recent.map((post) => post.title);
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
    if (buffer.length < 1000) return null;

    const asset = await getWriteClient().assets.upload('image', buffer, {
      filename: `article-${Date.now()}.jpg`,
    });
    return asset._id;
  } catch {
    return null;
  }
}

function textToBlocks(text: string): any[] {
  return text.split(/\n\n+/).filter(Boolean).map((p, i) => ({
    _type: 'block',
    _key: `body-${i}`,
    style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: p.trim() }],
    markDefs: [],
  }));
}

async function saveToSanity(article: PopularArticle, logs: string[]): Promise<{ id: string | null; error: string | null }> {
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
      return { id: null, error: 'No image' };
    }

    const catKey = article.category.toLowerCase();
    const catId = CATEGORY_MAP[catKey] || CATEGORY_MAP.nasional;
    const authorRef = AUTHOR_MAP[catKey] || AUTHOR_MAP.nasional;

    const title = article.title;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100);
    const content = article.content || title;
    const body = textToBlocks(content);
    const excerpt = article.excerpt || content.substring(0, 200);
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
      publishedAt: new Date().toISOString(),
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

  const logs: string[] = [];
  let totalFetched = 0;
  let totalSaved = 0;

  logs.push(`Starting fetch at ${new Date().toISOString()}`);

  // In-memory dedup: track titles saved in this batch
  const savedTitles: string[] = [];

  // Fetch semua artikel terpopuler dari 5 sumber berita
  logs.push(`\nFetching popular articles from news sites...`);
  const popular = await fetchAllPopular();
  logs.push(`Found ${popular.length} popular articles`);

  // Filter: skip konten tidak layak
  const allArticles = popular.filter((article) => {
    const content = article.content || article.title;
    if (shouldExclude(article.title, content)) {
      logs.push(`  ⏭ Filtered: ${article.title.substring(0, 55)}`);
      return false;
    }
    return true;
  });

  // ═══ DEDUP & SAVE ═══
  logs.push(`\nProcessing ${allArticles.length} total articles...`);

  // 1. Fetch existing titles dari Sanity (sekali saja)
  const existingTitles = await fetchRecentTitles();
  logs.push(`Found ${existingTitles.length} existing titles in last 24h`);

  // 2. Word-based fast filter: skip judul yang jelas mirip
  const wordFiltered: PopularArticle[] = [];
  let wordSkipped = 0;
  for (const article of allArticles) {
    if (isSimilarTitle(article.title, existingTitles) || isSimilarTitle(article.title, savedTitles)) {
      wordSkipped++;
    } else {
      wordFiltered.push(article);
    }
  }
  if (wordSkipped > 0) {
    logs.push(`  Word-based filter skipped ${wordSkipped} duplicates`);
  }

  // 3. AI dedup: semantic check via Claude Haiku
  let aiSkippedIndices: number[] = [];
  if (wordFiltered.length > 0 && existingTitles.length > 0) {
    logs.push(`Running AI dedup on ${wordFiltered.length} articles...`);
    const aiResult = await aiDeduplicate(
      wordFiltered.map((item) => item.title),
      existingTitles
    );
    aiSkippedIndices = aiResult.duplicateIndices;
    logs.push(`  AI dedup: ${aiResult.totalDuplicates} semantic duplicates found`);
  }

  // 4. Save articles that passed both filters
  for (let i = 0; i < wordFiltered.length; i++) {
    const article = wordFiltered[i];

    if (aiSkippedIndices.includes(i)) {
      logs.push(`  ⏭ AI duplikat: ${article.title.substring(0, 55)}`);
      totalFetched++;
      continue;
    }

    const result = await saveToSanity(article, logs);
    if (result.id) {
      totalSaved++;
      savedTitles.push(article.title);
      const hasImg = article.imageUrl ? '📷' : '  ';
      logs.push(`  ${hasImg} [${article.sourceName}] ${article.title.substring(0, 50)}`);
    }
    if (result.error) {
      logs.push(`  ✗ Save error: ${result.error}`);
    }
    totalFetched++;
  }

  logs.push(`\nDone! ${totalFetched} fetched, ${totalSaved} saved`);

  return NextResponse.json({
    success: true,
    totalFetched,
    totalSaved,
    logs,
  });
}
