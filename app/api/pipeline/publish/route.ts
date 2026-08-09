// ═══════════════════════════════════════════════════════════
//  PUBLISH — Publish artikel yang sudah di-approve
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';

interface ApprovedPost {
  _id: string;
  title: string;
  slug: { current: string };
  body: any[];
  excerpt: string;
  tags: string[];
  publishedAt: string;
  originalUrl: string;
  sourceName: string;
  aiDisclosure: boolean;
  aiMetadata?: {
    model: string;
    rewrittenAt: string;
    originalTitle: string;
  };
}

// Get default author ref
async function getDefaultAuthorRef(): Promise<string | null> {
  const author = await client.fetch<{ _id: string } | null>(
    `*[_type == "author" && slug.current == "warta-nusantara"][0]._id`
  );
  return author?._id || null;
}

// Get category ref by slug
async function getCategoryRef(slug: string): Promise<string | null> {
  const category = await client.fetch<{ _id: string } | null>(
    `*[_type == "category" && slug.current == $slug][0]._id`,
    { slug: slug.toLowerCase() }
  );
  return category?._id || null;
}

// Map category from post
function detectCategory(post: ApprovedPost): string {
  // Try to detect from tags
  const categoryKeywords: Record<string, string[]> = {
    nasional: ['politik', 'pemerintah', 'dpr', 'presiden', 'pilkada'],
    teknologi: ['ai', 'tech', 'startup', 'digital', 'gadget', 'aplikasi'],
    bisnis: ['saham', 'investasi', 'ekonomi', 'bisnis', 'rupiah'],
    olahraga: ['sepak bola', 'timnas', 'liga', 'motogp', 'bulu tangkis'],
    hiburan: ['artis', 'seleb', 'film', 'musik', 'konser'],
  };

  const text = (post.title + ' ' + (post.tags || []).join(' ')).toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }

  return 'nasional';
}

// Generate source attribution blocks
function createSourceBlocks(originalUrl: string, sourceName: string): any[] {
  return [
    {
      _type: 'block',
      _key: 'source-header',
      style: 'h4',
      children: [{ _type: 'span', _key: 'source-header-text', text: 'Sumber Berita' }],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'source-content',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'source-text',
          text: `Artikel ini diadaptasi dari ${sourceName}. `,
        },
        {
          _type: 'span',
          _key: 'source-link',
          marks: ['link'],
          text: 'Baca artikel asli',
        },
      ],
      markDefs: [
        {
          _type: 'link',
          _key: 'link-0',
          href: originalUrl,
        },
      ],
    },
  ];
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];
  let published = 0;
  let failed = 0;

  logs.push(`Starting publish at ${new Date().toISOString()}`);

  // Get default author
  const authorRef = await getDefaultAuthorRef();
  if (!authorRef) {
    return NextResponse.json(
      { error: 'Default author not found. Run /api/setup-authors first.' },
      { status: 500 }
    );
  }

  // Ambil artikel dengan status approved
  const posts = await client.fetch<ApprovedPost[]>(
    `*[_type == "post" && pipelineStatus == "approved"][0...10]{
      _id,
      title,
      slug,
      body,
      excerpt,
      tags,
      publishedAt,
      originalUrl,
      sourceName,
      aiDisclosure,
      aiMetadata
    }`
  );

  logs.push(`Found ${posts.length} approved articles to publish`);

  for (const post of posts) {
    logs.push(`\nPublishing: ${post.title.substring(0, 50)}...`);

    try {
      // Detect category
      const categorySlug = detectCategory(post);
      const categoryRef = await getCategoryRef(categorySlug);

      // Build categories array
      const categories = categoryRef
        ? [{ _type: 'reference', _ref: categoryRef }]
        : [];

      // Update document
      await writeClient
        .patch(post._id)
        .set({
          pipelineStatus: 'published',
          author: { _type: 'reference', _ref: authorRef },
          categories,
          publishedAt: post.publishedAt || new Date().toISOString(),
        })
        .commit();

      published++;
      logs.push(`  ✓ Published: ${post.title}`);
    } catch (error: any) {
      failed++;
      logs.push(`  ✗ Error: ${error.message}`);
    }
  }

  // Trigger revalidation
  if (published > 0) {
    try {
      const revalidateUrl = `${process.env.SITE_URL || 'https://tanahjarang.com'}/api/revalidate`;
      await fetch(revalidateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.PIPELINE_SECRET }),
      });
      logs.push(`\n✓ Revalidation triggered`);
    } catch {
      logs.push(`\n⚠ Revalidation failed`);
    }
  }

  logs.push(`\nDone! Published: ${published}, Failed: ${failed}`);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    published,
    failed,
    logs,
  });
}
