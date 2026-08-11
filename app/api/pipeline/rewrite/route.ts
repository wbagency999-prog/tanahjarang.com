// ═══════════════════════════════════════════════════════════
//  REWRITE — Rewrite artikel menggunakan AI Claude
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { getWriteClient } from '@/sanity/writeClient';
import { rewriteArticle } from '@/lib/ai-rewriter';

export const dynamic = 'force-dynamic';

interface PendingPost {
  _id: string;
  title: string;
  body: any[];
  originalUrl: string;
  sourceName: string;
  mainImage?: any;
}

// Ambil body text dari Portable Text blocks
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

// Convert plain text ke Portable Text blocks
function textToBlocks(text: string): any[] {
  const paragraphs = text.split('\n\n').filter(Boolean);

  return paragraphs.map((paragraph, index) => ({
    _type: 'block',
    _key: `body-${index}`,
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: `span-${index}`,
        text: paragraph.trim(),
      },
    ],
    markDefs: [],
  }));
}

// Mapping kategori
function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    nasional: 'Nasional',
    internasional: 'Internasional',
    teknologi: 'Teknologi',
    olahraga: 'Olahraga',
    hiburan: 'Hiburan',
    bisnis: 'Bisnis',
    pendidikan: 'Pendidikan',
    kesehatan: 'Kesehatan',
    otomotif: 'Otomotif',
  };

  return categoryMap[category.toLowerCase()] || 'Nasional';
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
  const logs: string[] = [];
  let processed = 0;
  let success = 0;
  let failed = 0;

  logs.push(`Starting AI rewrite at ${new Date().toISOString()}`);

  // Ambil artikel dengan status pending-review dan punya gambar
  const posts = await getWriteClient().fetch<PendingPost[]>(
    `*[_type == "post" && pipelineStatus == "pending-review" && defined(mainImage)] | order(publishedAt desc)[0...${limit}]{
      _id,
      title,
      body,
      originalUrl,
      sourceName,
      mainImage
    }`
  );

  logs.push(`Found ${posts.length} articles to rewrite`);

  for (const post of posts) {
    processed++;
    logs.push(`\nProcessing: ${post.title.substring(0, 50)}...`);

    try {
      // Extract body text
      const bodyText = extractBodyText(post.body);
      if (!bodyText || bodyText.length < 50) {
        logs.push(`  ⚠ Skipped: Content too short`);
        continue;
      }

      // Rewrite using AI
      const rewritten = await rewriteArticle(
        post.title,
        bodyText,
        post.sourceName || 'Unknown',
        'Nasional'
      );

      // Generate slug from title
      const slug = rewritten.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      const metaDesc = rewritten.metaDescription || rewritten.excerpt.substring(0, 160);
      const seoTitle = (rewritten.seoTitle || rewritten.title).substring(0, 60);
      const subtitle = (rewritten.subtitle || rewritten.title).substring(0, 120);
      const focusKeyphrase = rewritten.focusKeyphrase || '';
      const ogDescription = rewritten.ogDescription || rewritten.excerpt.substring(0, 200);
      const mainImageAlt = rewritten.mainImageAlt || rewritten.title.substring(0, 125);
      const imageCaption = rewritten.imageCaption || rewritten.mainImageAlt || rewritten.title.substring(0, 150);

      // Update document in Sanity with ALL required fields
      await getWriteClient()
        .patch(post._id)
        .set({
          title: rewritten.title,
          subtitle: subtitle,
          slug: { _type: 'slug', current: slug },
          excerpt: rewritten.excerpt,
          body: textToBlocks(rewritten.body),
          tags: rewritten.tags || [],
          metaDescription: metaDesc,
          metaTitle: seoTitle,
          focusKeyphrase: focusKeyphrase,
          'mainImage.alt': mainImageAlt,
          imageCaption: imageCaption,
          seo: {
            seoTitle: seoTitle,
            seoDescription: metaDesc,
            ogDescription: ogDescription,
          },
          pipelineStatus: 'ready-for-review',
          aiDisclosure: true,
          aiRewritten: true,
          komentarPembaca: true,
          amp: false,
          tableOfContent: true,
          // Analisis AI
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
        })
        .commit();

      success++;
      logs.push(`  ✓ Rewritten successfully`);
      logs.push(`    New title: ${rewritten.title}`);
    } catch (error: any) {
      failed++;
      logs.push(`  ✗ Error: ${error.message}`);
    }
  }

  logs.push(`\nDone! Processed: ${processed}, Success: ${success}, Failed: ${failed}`);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    processed,
    success,
    failed,
    logs,
  });
}
