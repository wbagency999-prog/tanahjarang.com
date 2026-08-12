// ═══════════════════════════════════════════════════════════
//  POSTS — CRUD untuk pipeline posts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
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
  comparisonScores?: {
    jaccardSimilarity: number;
    cosineSimilarity: number;
    bleuScore: number;
    rougeScore: number;
    aiJudgeScore: number;
    overallScore: number;
    compressionRatio: number;
    originalWordCount: number;
    rewriteWordCount: number;
    comparedAt: string;
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

  const validStatuses = ['pending-review', 'ready-for-review', 'approved', 'published', 'rejected', 'all'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  let query = `*[_type == "post"`;
  if (status !== 'all') {
    query += ` && pipelineStatus == $status`;
  }
  query += `] | order(publishedAt desc)[0...${limit}]{_id, title, excerpt, pipelineStatus, publishedAt, sourceName, originalUrl, tags, aiDisclosure, aiMetadata, comparisonScores}`;

  const posts = await writeClient.fetch<PipelinePost[]>(query, status !== 'all' ? { status } : {});

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
    if (status === 'published') {
      // Baca document lengkap
      const fullPost = await writeClient.fetch<any>(
        `*[_id == $id][0]`,
        { id: postId }
      );

      if (!fullPost) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Hapus draft
      await writeClient.delete(postId);

      // Buat published version
      const publishedId = postId.replace('drafts.', '');
      const { _id, _rev, _type, ...data } = fullPost;
      await writeClient.createIfNotExists({
        _id: publishedId,
        _type,
        ...data,
        pipelineStatus: 'published',
      });
    } else {
      await writeClient
        .patch(postId)
        .set({ pipelineStatus: status })
        .commit();
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
