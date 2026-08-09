// ═══════════════════════════════════════════════════════════
//  CLEANUP — Hapus semua artikel di Sanity
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
  let deleted = 0;
  let failed = 0;

  logs.push(`Starting cleanup at ${new Date().toISOString()}`);

  try {
    // Ambil semua post IDs
    const posts = await client.fetch<{ _id: string }[]>(
      `*[_type == "post"]{_id}`
    );

    logs.push(`Found ${posts.length} articles to delete`);

    // Delete satu per satu untuk handle referensi
    for (const post of posts) {
      try {
        await writeClient.delete(post._id);
        deleted++;
      } catch (error: any) {
        failed++;
        if (failed <= 5) {
          logs.push(`  Skip: ${post._id} - ${error.message.substring(0, 50)}`);
        }
      }
    }

    logs.push(`✓ Deleted ${deleted} articles`);
    if (failed > 0) {
      logs.push(`⚠ Skipped ${failed} articles (have references)`);
    }
  } catch (error: any) {
    logs.push(`✗ Error: ${error.message}`);
  }

  logs.push(`Done at ${new Date().toISOString()}`);

  return NextResponse.json({
    success: true,
    deleted,
    failed,
    logs,
  });
}
