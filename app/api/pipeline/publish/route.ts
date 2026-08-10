// ═══════════════════════════════════════════════════════════
//  PUBLISH — Publish artikel yang sudah di-approve editor
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];
  let published = 0;
  let failed = 0;

  logs.push(`Starting publish at ${new Date().toISOString()}`);

  // Ambil artikel dengan status approved (sudah di-review editor)
  const posts = await client.fetch<{ _id: string; title: string }[]>(
    `*[_type == "post" && pipelineStatus == "approved"] | order(publishedAt desc)[0...10]{
      _id,
      title
    }`
  );

  logs.push(`Found ${posts.length} approved articles to publish`);

  for (const post of posts) {
    logs.push(`\nPublishing: ${post.title.substring(0, 50)}...`);

    try {
      // Step 1: Update pipelineStatus dulu
      await writeClient
        .patch(post._id)
        .set({ pipelineStatus: 'published' })
        .commit();

      // Step 2: Publish dokumen dari draft ke published via HTTP API
      const projectId = '7kf72dsd';
      const dataset = 'production';
      const token = process.env.SANITY_API_WRITE_TOKEN;
      const publishUrl = `https://${projectId}.api.sanity.io/v2024-01-01/data/publish/${dataset}/${post._id}`;

      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!publishRes.ok) {
        const errText = await publishRes.text();
        logs.push(`  ⚠ Publish API error: ${publishRes.status} - ${errText}`);
      } else {
        published++;
        logs.push(`  ✓ Published: ${post.title}`);
      }
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
