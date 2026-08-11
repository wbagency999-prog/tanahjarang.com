// ═══════════════════════════════════════════════════════════
//  FETCH — Fetch berita terpopuler (streaming response)
// ═══════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';
import { shouldExclude } from '@/lib/content-filters';
import { isSimilarTitle } from '@/lib/title-dedup';
import { aiDeduplicate } from '@/lib/ai-dedup';
import { fetchAllPopular, type PopularArticle } from '@/lib/popular-scraper';
import { rewriteArticle } from '@/lib/ai-rewriter';
import { cleanContent } from '@/lib/popular-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PIPELINE_STATUSES = ['published', 'ready-for-review', 'pending-review'] as const;

const CATEGORY_MAP: Record<string, string> = {
  nasional: 'kF0pH8zAeRz6etg9XEHvmR',
  internasional: 'vG7OWidh2JKCGmChuCBMZo',
  teknologi: '4jdLeV61fwp22DXUjLo4vy',
  olahraga: '4jdLeV61fwp22DXUjLo5kM',
  hiburan: 'kF0pH8zAeRz6etg9XEHw11',
  bisnis: 'a89c1f1f-b021-4604-9214-2b9e9ef097c8',
  pendidikan: 'vG7OWidh2JKCGmChuCBMmJ',
  otomotif: 'c669d085-a81e-45ac-8057-12a955e6e20a',
  kesehatan: 'vG7OWidh2JKCGmChuCBMmJ',
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
  kesehatan: '11XvD3mq7HlIxXJq9S3TRh',
};

async function fetchRecentTitles(): Promise<string[]> {
  const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const recent = await getWriteClient().fetch<{ title: string }[]>(
    `*[_type == "post" && pipelineStatus in $statuses && publishedAt > $threeDaysAgo] | order(publishedAt desc)[0...200]{ title }`,
    { threeDaysAgo, statuses: PIPELINE_STATUSES }
  );
  return recent.map((post) => post.title);
}

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
    _type: 'block', _key: `body-${i}`, style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: p.trim() }],
    markDefs: [],
  }));
}

async function saveToSanity(article: PopularArticle): Promise<{ id: string | null; docId: string | null; error: string | null }> {
  try {
    let mainImage: any = undefined;
    if (article.imageUrl) {
      const assetId = await uploadImage(article.imageUrl);
      if (assetId) {
        mainImage = { _type: 'image', asset: { _type: 'reference', _ref: assetId }, alt: article.title.substring(0, 125) };
      }
    }
    if (!mainImage) return { id: null, docId: null, error: 'No image' };

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

    const docId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const result = await getWriteClient().create({
      _id: `drafts.${docId}`,
      _type: 'post', title,
      slug: { _type: 'slug', current: slug },
      subtitle: title.substring(0, 120),
      excerpt, body,
      mainImage: { ...mainImage, alt: title.substring(0, 125) },
      publishedAt: new Date().toISOString(),
      originalUrl: article.link, sourceName: article.sourceName,
      pipelineStatus: 'pending-review', tags: [], views: 0,
      aiDisclosure: true, aiRewritten: false, komentarPembaca: true,
      amp: false, tableOfContent: true,
      metaDescription: metaDesc, metaTitle: seoTitle, focusKeyphrase: '',
      seo: { seoTitle, seoDescription: metaDesc, ogDescription: excerpt.substring(0, 200) },
      imageCaption: `${title} | Foto: ${article.sourceName}`,
      author: { _type: 'reference' as const, _ref: authorRef },
      categories: [{ _type: 'reference' as const, _ref: catId, _key: `cat-${catId}` }],
    });
    return { id: result._id, docId: `drafts.${docId}`, error: null };
  } catch (error: any) {
    return { id: null, docId: null, error: error.message };
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const cronAuth = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (secret !== process.env.PIPELINE_SECRET && !cronAuth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Streaming response — keep connection alive while processing
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'));
      let runId: string | null = null;

      try {
        send(`Starting fetch at ${new Date().toISOString()}`);

        // Concurrency guard — cek apakah pipeline sedang berjalan
        const existingRun = await getWriteClient().fetch<{ _id: string } | null>(
          `*[_type == "pipelineRun" && status == "running"][0]{ _id }`
        );
        if (existingRun) {
          send('⚠ Pipeline sedang berjalan oleh proses lain. Coba lagi nanti.');
          controller.close();
          return;
        }

        // Tandai pipeline sedang berjalan
        runId = `pipelineRun-${Date.now()}`;
        await getWriteClient().create({
          _id: runId,
          _type: 'pipelineRun',
          status: 'running',
          startedAt: new Date().toISOString(),
        });

        const savedTitles: string[] = [];

        send(`Fetching popular articles from news sites...`);
        const popular = await fetchAllPopular();
        send(`Found ${popular.length} popular articles`);

        const allArticles = popular.filter((a) => !shouldExclude(a.title, a.content || a.title));
        send(`After content filter: ${allArticles.length} articles`);

        const existingTitles = await fetchRecentTitles();
        send(`Found ${existingTitles.length} existing titles in last 72h`);

        // Word-based dedup
        const wordFiltered: PopularArticle[] = [];
        let wordSkipped = 0;
        for (const article of allArticles) {
          if (isSimilarTitle(article.title, existingTitles) || isSimilarTitle(article.title, savedTitles)) {
            wordSkipped++;
          } else {
            wordFiltered.push(article);
          }
        }
        send(`Word-based filter: skipped ${wordSkipped} duplicates, ${wordFiltered.length} remaining`);

        // AI dedup
        let aiSkippedIndices: number[] = [];
        if (wordFiltered.length > 0 && existingTitles.length > 0) {
          send(`Running AI dedup on ${wordFiltered.length} articles...`);
          const aiResult = await aiDeduplicate(
            wordFiltered.map((item) => item.title),
            existingTitles
          );
          aiSkippedIndices = aiResult.duplicateIndices;
          send(`AI dedup: ${aiResult.totalDuplicates} semantic duplicates found`);
        }

        // Save + AI Rewrite
        let totalSaved = 0;
        let totalRewritten = 0;
        let totalFetched = 0;
        for (let i = 0; i < wordFiltered.length; i++) {
          const article = wordFiltered[i];
          if (aiSkippedIndices.includes(i)) {
            send(`  ⏭ AI duplikat: ${article.title.substring(0, 55)}`);
            totalFetched++;
            continue;
          }

          const result = await saveToSanity(article);
          if (result.id && result.docId) {
            totalSaved++;
            savedTitles.push(article.title);
            send(`  📰 [${article.sourceName}] ${article.title.substring(0, 50)}`);

            // AI Rewrite langsung
            try {
              const content = cleanContent(article.content || article.title);
              if (content.length > 50) {
                const rewritten = await rewriteArticle(
                  article.title, content, article.sourceName || 'Unknown', article.category || 'Nasional'
                );

                const slug = rewritten.title
                  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 100);

                await getWriteClient()
                  .patch(result.docId)
                  .set({
                    title: rewritten.title,
                    subtitle: (rewritten.subtitle || rewritten.title).substring(0, 120),
                    slug: { _type: 'slug', current: slug },
                    excerpt: rewritten.excerpt,
                    body: textToBlocks(rewritten.body),
                    tags: rewritten.tags || [],
                    metaDescription: (rewritten.metaDescription || rewritten.excerpt.substring(0, 160)),
                    metaTitle: (rewritten.seoTitle || rewritten.title).substring(0, 60),
                    focusKeyphrase: rewritten.focusKeyphrase || '',
                    'mainImage.alt': (rewritten.mainImageAlt || rewritten.title).substring(0, 125),
                    imageCaption: (rewritten.imageCaption || rewritten.mainImageAlt || rewritten.title).substring(0, 150),
                    seo: {
                      seoTitle: (rewritten.seoTitle || rewritten.title).substring(0, 60),
                      seoDescription: (rewritten.metaDescription || rewritten.excerpt.substring(0, 160)),
                      ogDescription: (rewritten.ogDescription || rewritten.excerpt.substring(0, 200)),
                    },
                    pipelineStatus: 'ready-for-review',
                    aiDisclosure: true,
                    aiRewritten: true,
                    factCheckScore: rewritten.analysis?.factCheckScore ?? null,
                    ethicsScore: rewritten.analysis?.ethicsScore ?? null,
                    originalityScore: rewritten.analysis?.originalityScore ?? null,
                    plagiarismScore: rewritten.analysis?.plagiarismScore ?? null,
                    sourceAttributions: rewritten.analysis?.sourceAttributions || [],
                    verifiedFacts: rewritten.analysis?.verifiedFacts || [],
                    aiMetadata: {
                      model: 'claude-haiku-4-5-20251001',
                      rewrittenAt: new Date().toISOString(),
                      originalTitle: article.title,
                    },
                  })
                  .commit();

                totalRewritten++;
                send(`    ✍️ AI rewrite: ${rewritten.title.substring(0, 50)}`);
              }
            } catch (rewriteError: any) {
              send(`    ⚠ Rewrite gagal: ${rewriteError.message.substring(0, 40)}`);
            }
          }
          if (result.error) {
            send(`  ✗ ${result.error}: ${article.title.substring(0, 40)}`);
          }
          totalFetched++;
        }

        send(`\nDone! ${totalFetched} fetched, ${totalSaved} saved, ${totalRewritten} rewritten`);

        // Bersihkan pipeline run flag
        if (runId) try { await getWriteClient().delete(runId); } catch { /* best effort */ }

        controller.close();
      } catch (error: any) {
        send(`Error: ${error.message}`);
        // Bersihkan pipeline run flag
        if (runId) try { await getWriteClient().delete(runId); } catch { /* best effort */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
