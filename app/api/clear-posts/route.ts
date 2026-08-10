// ═══════════════════════════════════════════════════════════
//  CLEAR POSTS — Hapus semua artikel lama dari Sanity
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { client } from '@/sanity/client'
import { writeClient } from '@/sanity/writeClient'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  
  const secret = process.env.PIPELINE_SECRET
  if (!body.secret || !secret || body.secret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs: string[] = []

  try {
    // Delete all comments using writeClient
    const comments = await client.fetch<{ _id: string }[]>('*[_type == "comment"]{_id}')
    for (const c of comments) {
      await writeClient.delete(c._id)
    }
    logs.push(`✅ Deleted ${comments.length} comments`)

    // Delete all reactions using writeClient
    const reactions = await client.fetch<{ _id: string }[]>('*[_type == "reaction"]{_id}')
    for (const r of reactions) {
      await writeClient.delete(r._id)
    }
    logs.push(`✅ Deleted ${reactions.length} reactions`)

    // Delete all posts using writeClient
    const posts = await client.fetch<{ _id: string }[]>('*[_type == "post"]{_id}')
    for (const p of posts) {
      await writeClient.delete(p._id)
    }
    logs.push(`✅ Deleted ${posts.length} posts`)

    return NextResponse.json({
      success: true,
      message: 'All posts, comments, and reactions cleared.',
      deleted: {
        comments: comments.length,
        reactions: reactions.length,
        posts: posts.length,
      },
      logs,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, logs }, { status: 500 })
  }
}
