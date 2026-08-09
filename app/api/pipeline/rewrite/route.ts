// ═══════════════════════════════════════════════════════════
//  REWRITE — Rewrite artikel menggunakan AI Claude
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';
import { rewriteArticle } from '@/lib/ai-rewriter';

export const dynamic = 'force-dynamic';

interface PendingPost {
  _id: string;
  title: string;
  body: any[];
  originalUrl: string;
  sourceName: string;
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

  const logs: string[] = [];
  let processed = 0;
  let success = 0;
  let failed = 0;

  logs.push(`Starting AI rewrite at ${new Date().toISOString()}`);

  // Ambil artikel dengan status pending-review
  const posts = await client.fetch<PendingPost[]>(
    `*[_type == "post" && pipelineStatus == "pending-review"][0...10]{
      _id,
      title,
      body,
      originalUrl,
      sourceName
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

      // Update document in Sanity
      await writeClient
        .patch(post._id)
        .set({
          title: rewritten.title,
          subtitle: rewritten.subtitle,
          excerpt: rewritten.excerpt,
          body: textToBlocks(rewritten.body),
          tags: rewritten.tags,
          pipelineStatus: 'ready-for-review',
          aiDisclosure: true,
          aiMetadata: {
            model: 'claude-sonnet-5-20250514',
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
