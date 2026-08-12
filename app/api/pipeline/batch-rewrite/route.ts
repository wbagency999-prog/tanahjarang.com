// ═══════════════════════════════════════════════════════════
//  BATCH REWRITE — Rewrite semua artikel pending-review
// ═══════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';
import { rewriteArticle } from '@/lib/ai-rewriter';
import { cleanContent } from '@/lib/popular-scraper';
import { compareArticles } from '@/lib/text-comparison';
import { cleanSlug } from '@/lib/slug-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface PendingPost {
  _id: string;
  title: string;
  body: any[];
  sourceName: string;
  category?: string;
  mainImage?: any;
}

function extractBodyText(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks
    .map((block) => {
      if (block._type === 'block' && block.children) {
        return block.children
          .filter((child: any) => child._type === 'span')
          .map((child: any) => child.text)
          .join('');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function textToBlocks(text: string): any[] {
  return text.split(/\n\n+/).filter(Boolean).map((p, i) => ({
    _type: 'block', _key: `body-${i}`, style: 'normal',
    children: [{ _type: 'span', _key: `span-${i}`, text: p.trim() }],
    markDefs: [],
  }));
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const cronAuth = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (secret !== process.env.PIPELINE_SECRET && !cronAuth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'));

      try {
        send(`Starting batch rewrite at ${new Date().toISOString()}`);

        const posts = await getWriteClient().fetch<PendingPost[]>(
          `*[_type == "post" && pipelineStatus == "pending-review" && defined(mainImage)] | order(publishedAt desc)[0...${limit}]{
            _id, title, body, sourceName, category, mainImage
          }`
        );

        send(`Found ${posts.length} articles to rewrite`);

        let success = 0;
        let failed = 0;

        for (const post of posts) {
          send(`\nRewriting: ${post.title.substring(0, 55)}...`);

          try {
            const bodyText = cleanContent(extractBodyText(post.body));
            if (!bodyText || bodyText.length < 50) {
              send(`  ⚠ Skipped: content too short`);
              failed++;
              continue;
            }

            const rewritten = await rewriteArticle(
              post.title, bodyText, post.sourceName || 'Unknown', post.category || 'Nasional'
            );

            const slug = cleanSlug(rewritten.title);

            // Jalankan perbandingan original vs rewrite
            let comparisonScores: any = null;
            try {
              const comp = await compareArticles(bodyText, rewritten.body, post.sourceName || 'Unknown');
              comparisonScores = {
                jaccardSimilarity: comp.jaccard,
                cosineSimilarity: comp.cosine,
                bleuScore: comp.bleu,
                rougeScore: comp.rouge,
                aiJudgeScore: comp.aiJudge.originalityScore,
                overallScore: Math.round(
                  comp.jaccard * 0.15 + comp.cosine * 0.25 + (100 - comp.bleu) * 0.20 +
                  comp.rouge * 0.20 + comp.aiJudge.originalityScore * 0.20
                ),
                compressionRatio: Math.round((rewritten.body.split(/\s+/).length / bodyText.split(/\s+/).length) * 100) / 100,
                originalWordCount: bodyText.split(/\s+/).length,
                rewriteWordCount: rewritten.body.split(/\s+/).length,
                comparedAt: new Date().toISOString(),
              };
              send(`  📊 Skor: J=${comparisonScores.jaccard} C=${comparisonScores.cosine} O=${comparisonScores.overallScore}`);
            } catch { /* comparison gagal tidak block pipeline */ }

            await getWriteClient()
              .patch(post._id)
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
                  originalTitle: post.title,
                },
                originalContent: bodyText.substring(0, 50000),
                ...(comparisonScores && { comparisonScores }),
              })
              .commit();

            success++;
            send(`  ✓ → ${rewritten.title.substring(0, 55)}`);
          } catch (error: any) {
            failed++;
            send(`  ✗ Error: ${error.message.substring(0, 50)}`);
          }
        }

        send(`\nDone! ${success} rewritten, ${failed} failed`);
      } catch (error: any) {
        send(`Error: ${error.message}`);
      } finally {
        try { controller.close(); } catch { /* already closed */ }
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
