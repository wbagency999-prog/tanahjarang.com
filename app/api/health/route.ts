// ═══════════════════════════════════════════════════════════
//  HEALTH — Pipeline health check + stats
// ═══════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getWriteClient } from '@/sanity/writeClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.PIPELINE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const writeClient = getWriteClient();

    const [pendingCount, readyCount, publishedCount, rejectedCount, totalCount] = await Promise.all([
      writeClient.fetch<number>(`count(*[_type == "post" && pipelineStatus == "pending-review"])`),
      writeClient.fetch<number>(`count(*[_type == "post" && pipelineStatus == "ready-for-review"])`),
      writeClient.fetch<number>(`count(*[_type == "post" && pipelineStatus == "published"])`),
      writeClient.fetch<number>(`count(*[_type == "post" && pipelineStatus == "rejected"])`),
      writeClient.fetch<number>(`count(*[_type == "post"])`),
    ]);

    const lastPublished = await writeClient.fetch<{ title: string; publishedAt: string }[]>(
      `*[_type == "post" && pipelineStatus == "published"] | order(publishedAt desc)[0...3]{ title, publishedAt }`
    );

    const lastFetched = await writeClient.fetch<{ title: string; publishedAt: string }[]>(
      `*[_type == "post" && pipelineStatus == "pending-review"] | order(publishedAt desc)[0...3]{ title, publishedAt }`
    );

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      counts: {
        pendingReview: pendingCount,
        readyForReview: readyCount,
        published: publishedCount,
        rejected: rejectedCount,
        total: totalCount,
      },
      lastPublished,
      lastFetched,
    });
  } catch (error: any) {
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
