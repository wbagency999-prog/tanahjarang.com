// ═══════════════════════════════════════════════════════════
//  PUBLISH — Publish artikel yang sudah di-approve editor
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';
import { isPipelineRequestAuthorized } from '@/lib/auth';
import { acquirePipelineLock } from '@/lib/pipeline-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MIN_FACT_CHECK = 60;
const MIN_OVERALL = 50;
const MAX_PLAGIARISM = 60;

export async function GET(request: NextRequest) {
  if (!isPipelineRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const writeClient = getWriteClient();
  const logs: string[] = [];
  let published = 0;
  let failed = 0;

  // Lock tunggal lintas-route: tolak jika pipeline lain (fetch/batch) sedang berjalan
  const lock = await acquirePipelineLock();
  if (!lock) {
    return NextResponse.json(
      { error: 'Pipeline sedang berjalan oleh proses lain', logs },
      { status: 409 }
    );
  }

  try {
  logs.push(`Starting publish at ${new Date().toISOString()}`);

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

  // Hanya publish yang sudah di-approve editor (bukan ready-for-review)
  const posts = await writeClient.fetch<{ _id: string; title: string; factCheckScore?: number; comparisonScores?: any }[]>(
    `*[_type == "post" && _id in path("drafts.**") && pipelineStatus == "approved"] | order(publishedAt desc)[0...${limit}]{
      _id,
      title,
      factCheckScore,
      comparisonScores
    }`
  );

  logs.push(`Found ${posts.length} approved drafts to publish`);

  const publishedIds: string[] = [];

  for (const post of posts) {
    logs.push(`\nPublishing: ${post.title.substring(0, 50)}...`);

    // Gate 1 — fact check (harus ada & >= ambang)
    if (post.factCheckScore === null || post.factCheckScore === undefined) {
      logs.push(`  ⚠ Skipped: no factCheckScore (quality gate)`);
      failed++;
      continue;
    }
    if (post.factCheckScore < MIN_FACT_CHECK) {
      logs.push(`  ⚠ Skipped: factCheckScore ${post.factCheckScore} < ${MIN_FACT_CHECK} (quality gate)`);
      failed++;
      continue;
    }

    // Gate 2 — skor objektif (jaring pengaman kedua, bukan self-report)
    const cs = post.comparisonScores;
    if (cs && cs.overallScore !== undefined && cs.overallScore !== null && cs.overallScore < MIN_OVERALL) {
      logs.push(`  ⚠ Skipped: overallScore ${cs.overallScore} < ${MIN_OVERALL} (quality gate)`);
      failed++;
      continue;
    }
    if (cs && cs.plagiarismScore !== undefined && cs.plagiarismScore !== null && cs.plagiarismScore > MAX_PLAGIARISM) {
      logs.push(`  ⚠ Skipped: plagiarismScore ${cs.plagiarismScore} > ${MAX_PLAGIARISM} (quality gate)`);
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
      publishedIds.push(publishedId);

      // Hapus draft setelah publish sukses
      try { await writeClient.delete(post._id); } catch { /* draft auto-replaced */ }

      published++;
    } catch (error: any) {
      failed++;
      logs.push(`  ✗ Error: ${(error.message || 'unknown').substring(0, 80)}`);
    }
  }

  // Trigger revalidation untuk SEMUA post yang ter-publish, bukan hanya yang pertama
  if (publishedIds.length > 0) {
    for (const publishedId of publishedIds) {
      try {
        const revalidateUrl = `${process.env.SITE_URL || 'https://tanahjarang.com'}/api/revalidate`;
        await fetch(revalidateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: process.env.PIPELINE_SECRET, docId: publishedId }),
        });
        logs.push(`  ✓ Revalidated: ${publishedId}`);
      } catch {
        logs.push(`  ⚠ Revalidate failed: ${publishedId}`);
      }
    }
    logs.push(`\n✓ Revalidation triggered for ${publishedIds.length} posts`);
  }

  logs.push(`\nDone! Published: ${published}, Failed: ${failed}`);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    published,
    failed,
    publishedIds,
    logs,
  });

  } finally {
    await lock.release();
  }
}
