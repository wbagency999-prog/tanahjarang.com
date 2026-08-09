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
  // Known author ID from Sanity
  return 'Z7sgg6YupGd2FS20j7fQ5s'; // Warta Nusantara
}

// Get author ref by category
async function getAuthorByCategory(category: string): Promise<string> {
  const authorMap: Record<string, string> = {
    nasional: 'Z7sgg6YupGd2FS20j7fQ5s', // Warta Nusantara
    teknologi: 'Z7sgg6YupGd2FS20j7fQ5s',
    bisnis: 'Z7sgg6YupGd2FS20j7fQ5s',
    olahraga: 'Z7sgg6YupGd2FS20j7fQ5s',
    hiburan: 'Z7sgg6YupGd2FS20j7fQ5s',
    internasional: 'Z7sgg6YupGd2FS20j7fQ5s',
  };
  return authorMap[category] || 'Z7sgg6YupGd2FS20j7fQ5s';
}

// Get category ref by slug
async function getCategoryRef(slug: string): Promise<string | null> {
  const category = await writeClient.fetch<{ _id: string } | null>(
    `*[_type == "category" && slug.current == $slug][0]._id`,
    { slug: slug.toLowerCase() }
  );
  return category?._id || null;
}

// Map category from post - lebih lengkap
function detectCategory(post: ApprovedPost): string {
  const categoryKeywords: Record<string, string[]> = {
    nasional: ['politik', 'pemerintah', 'dpr', 'presiden', 'pilkada', 'menteri', 'jakarta', 'indonesia'],
    internasional: ['luar negeri', 'amerika', 'china', 'jepang', 'eropa', 'timur tengah', 'australia'],
    teknologi: ['ai', 'tech', 'startup', 'digital', 'gadget', 'aplikasi', 'teknologi', 'software', 'hardware'],
    bisnis: ['saham', 'investasi', 'ekonomi', 'bisnis', 'rupiah', 'bank', ' pasar modal', 'idx'],
    olahraga: ['sepak bola', 'timnas', 'liga', 'motogp', 'bulu tangkis', 'olahraga', 'piala', 'football'],
    hiburan: ['artis', 'seleb', 'film', 'musik', 'konser', 'hiburan', 'selebriti', 'drama'],
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

      // Get author based on category
      const authorByCategory = await getAuthorByCategory(categorySlug);

      // Build categories array - WAJIB ada
      const categories = categoryRef
        ? [{ _type: 'reference', _ref: categoryRef }]
        : [];

      // Ensure slug exists
      const slug = post.slug?.current || post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);

      const metaDesc = post.excerpt?.substring(0, 160) || post.title;
      const seoTitle = post.title.substring(0, 70); // Max 70 karakter

      // Update document with ALL required fields
      await writeClient
        .patch(post._id)
        .set({
          pipelineStatus: 'published',
          author: { _type: 'reference', _ref: authorByCategory },
          categories,
          slug: { _type: 'slug', current: slug },
          publishedAt: post.publishedAt || new Date().toISOString(),
          metaDescription: metaDesc,
          metaTitle: seoTitle,
          seoTitle: seoTitle,
          seoDescription: metaDesc,
          tableOfContent: false,
          amp: false,
          komentarPembaca: true, // Selalu aktif
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
