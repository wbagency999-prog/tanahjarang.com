// ═══════════════════════════════════════════════════════════
//  CLEANUP — Hapus artikel rejected/lama (POST only, aman)
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';
import { isPipelineRequestAuthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { secret, confirm, mode } = body;

  if (!isPipelineRequestAuthorized(request, body.secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (confirm !== true) {
    return NextResponse.json({ error: 'confirm=true required' }, { status: 400 });
  }

  const writeClient = getWriteClient();
  const logs: string[] = [];
  let deleted = 0;
  let failed = 0;

  logs.push(`Starting cleanup at ${new Date().toISOString()}`);

  try {
    let query: string;

    if (mode === 'rejected') {
      // Hanya hapus artikel yang ditolak editor
      query = `*[_type == "post" && pipelineStatus == "rejected"]{_id}`;
    } else if (mode === 'old') {
      // Hapus artikel > 30 hari yang belum published
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = `*[_type == "post" && pipelineStatus != "published" && publishedAt < $thirtyDaysAgo]{_id}`;
    } else {
      // Default: hapus rejected + pending > 7 hari
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = `*[_type == "post" && (pipelineStatus == "rejected" || (pipelineStatus == "pending-review" && publishedAt < $sevenDaysAgo))]{_id}`;
    }

    const posts = await writeClient.fetch<{ _id: string }[]>(
      query,
      mode === 'old' ? { thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() } :
      mode !== 'rejected' ? { sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } : {}
    );

    logs.push(`Found ${posts.length} articles to delete (mode: ${mode || 'default'})`);

    for (const post of posts) {
      try {
        await writeClient.delete(post._id);
        deleted++;
      } catch (error: any) {
        failed++;
        if (failed <= 5) logs.push(`  Skip: ${post._id} - ${error.message.substring(0, 50)}`);
      }
    }

    logs.push(`Deleted ${deleted} articles`);
    if (failed > 0) logs.push(`Skipped ${failed} articles`);
  } catch (error: any) {
    logs.push(`Error: ${error.message}`);
  }

  return NextResponse.json({ success: true, deleted, failed, logs });
}

// GET tidak diizinkan — harus pakai POST
export async function GET() {
  return NextResponse.json({ error: 'Use POST with confirm=true' }, { status: 405 });
}
