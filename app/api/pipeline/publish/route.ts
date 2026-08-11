// ═══════════════════════════════════════════════════════════
//  PUBLISH — Publish artikel yang sudah di-approve editor
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const writeClient = getWriteClient();
  const logs: string[] = [];
  let published = 0;
  let failed = 0;

  logs.push(`Starting publish at ${new Date().toISOString()}`);

  // Ambil SEMUA draft articles (sudah final dari fetch)
  const posts = await writeClient.fetch<{ _id: string; title: string }[]>(
    `*[_type == "post" && _id in path("drafts.**")] | order(publishedAt desc)[0...50]{
      _id,
      title,
      ...
    }`
  );

  logs.push(`Found ${posts.length} draft articles to publish`);

  for (const post of posts) {
    logs.push(`\nPublishing: ${post.title.substring(0, 50)}...`);

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

      // Hapus draft
      await writeClient.delete(post._id);
      logs.push(`  ✓ Draft deleted`);

      // Buat published version (tanpa prefix drafts.)
      const publishedId = post._id.replace('drafts.', '');
      const { _id, _rev, _type, ...data } = fullPost;
      await writeClient.createIfNotExists({
        _id: publishedId,
        _type,
        ...data,
        pipelineStatus: 'published',
      });
      logs.push(`  ✓ Published as: ${publishedId}`);

      published++;
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
