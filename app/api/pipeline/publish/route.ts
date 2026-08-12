// ═══════════════════════════════════════════════════════════
//  PUBLISH — Publish artikel yang sudah di-approve editor
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const cronAuth = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (secret !== process.env.PIPELINE_SECRET && !cronAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const writeClient = getWriteClient();
  const logs: string[] = [];
  let published = 0;
  let failed = 0;

  logs.push(`Starting publish at ${new Date().toISOString()}`);

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  // Ambil draft articles yang sudah ready-for-review (sudah di-rewrite AI)
  // Quality gate: hanya publish yang factCheckScore >= 60
  const posts = await writeClient.fetch<{ _id: string; title: string; factCheckScore?: number }[]>(
    `*[_type == "post" && _id in path("drafts.**") && pipelineStatus == "ready-for-review"] | order(publishedAt desc)[0...${limit}]{
      _id,
      title,
      factCheckScore
    }`
  );

  logs.push(`Found ${posts.length} draft articles to publish`);

  for (const post of posts) {
    logs.push(`\nPublishing: ${post.title.substring(0, 50)}...`);

    // Quality gate: skip jika factCheckScore rendah ATAU tidak ada
    if (post.factCheckScore === null || post.factCheckScore === undefined) {
      logs.push(`  ⚠ Skipped: no factCheckScore (quality gate)`);
      failed++;
      continue;
    }
    if (post.factCheckScore < 60) {
      logs.push(`  ⚠ Skipped: factCheckScore ${post.factCheckScore} < 60 (quality gate)`);
      failed++;
      continue;
    }

    try {
      // Baca draft document lengkap
      const fullPost = await writeClient.fetch<any>(
        `*[_id == $id][0]`,
        { id: post._id }
      );

      if (!fullPost) {
        logs.push(`  ✗ Document not found: ${post._id}`);
        failed++;
        continue;
      }

      // Publish atomik: createOrReplace (hapus draft + buat published dalam 1 operasi)
      const publishedId = post._id.replace('drafts.', '');
      const { _id, _rev, _type, ...data } = fullPost;
      await writeClient.createOrReplace({
        _id: publishedId,
        _type,
        ...data,
        publishedAt: new Date().toISOString(),
        pipelineStatus: 'published',
      });
      logs.push(`  ✓ Published atomik: ${publishedId}`);

      // Hapus draft setelah publish sukses
      try { await writeClient.delete(post._id); } catch { /* draft auto-replaced */ }

      published++;
    } catch (error: any) {
      failed++;
      logs.push(`  ✗ Error: ${error.message}`);
    }
  }

  // Trigger revalidation dengan published ID (bukan draft ID)
  if (published > 0) {
    try {
      const revalidateUrl = `${process.env.SITE_URL || 'https://tanahjarang.com'}/api/revalidate`;
      await fetch(revalidateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.PIPELINE_SECRET, docId: posts[0]?._id?.replace('drafts.', '') }),
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
