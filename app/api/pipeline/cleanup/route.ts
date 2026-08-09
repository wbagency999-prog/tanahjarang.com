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

  logs.push(`Starting cleanup at ${new Date().toISOString()}`);

  try {
    // Ambil semua post IDs
    const posts = await client.fetch<{ _id: string }[]>(
      `*[_type == "post"]{_id}`
    );

    logs.push(`Found ${posts.length} articles to delete`);

    // Delete dalam batch
    const transaction = writeClient.transaction();
    for (const post of posts) {
      transaction.delete(post._id);
      deleted++;
    }

    await transaction.commit();
    logs.push(`✓ Deleted ${deleted} articles`);
  } catch (error: any) {
    logs.push(`✗ Error: ${error.message}`);
  }

  logs.push(`Done at ${new Date().toISOString()}`);

  return NextResponse.json({
    success: true,
    deleted,
    logs,
  });
}
