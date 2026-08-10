// ═══════════════════════════════════════════════════════════
//  POSTS — CRUD untuk pipeline posts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/client';
import { writeClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';

interface PipelinePost {
  _id: string;
  title: string;
  excerpt: string;
  pipelineStatus: string;
  publishedAt: string;
  sourceName: string;
  tags: string[];
  aiDisclosure: boolean;
  aiMetadata?: {
    model: string;
    rewrittenAt: string;
    originalTitle: string;
  };
}

// GET — Fetch posts by status
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status') || 'all';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

  let query = `*[_type == "post"`;
  if (status !== 'all') {
    query += ` && pipelineStatus == "${status}"`;
  }
  query += `] | order(publishedAt desc)[0...${limit}]{_id, title, excerpt, pipelineStatus, publishedAt, sourceName, tags, aiDisclosure, aiMetadata}`;

  const posts = await client.fetch<PipelinePost[]>(query);

  return NextResponse.json({ posts });
}

// PATCH — Update post status
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { secret, postId, status } = body;

  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!postId || !status) {
    return NextResponse.json({ error: 'Missing postId or status' }, { status: 400 });
  }

  const validStatuses = ['pending-review', 'ready-for-review', 'approved', 'published', 'rejected'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    // Patch pipelineStatus
    await writeClient
      .patch(postId)
      .set({ pipelineStatus: status })
      .commit();

    // Jika status "published", publish dokumen dari draft ke published
    if (status === 'published') {
      await writeClient.publish(postId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Delete post
export async function DELETE(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const postId = request.nextUrl.searchParams.get('postId');
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
  }

  try {
    await writeClient.delete(postId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
