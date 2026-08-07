// ═══════════════════════════════════════════════════════════
//  FIX BLOCK KEYS — Perbaiki artikel lama yang _key hilang
//  Jalankan sekali untuk fix semua artikel existing
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { client } from '@/sanity/client'
import { writeClient } from '@/sanity/writeClient'

export const dynamic = 'force-dynamic'

/**
 * Tambahkan _key ke semua block yang belum punya _key
 */
function fixBlockKeys(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return blocks

  return blocks.map((block: any, blockIndex: number) => {
    // Pastikan block punya _key
    const fixedBlock = { ...block }
    if (!fixedBlock._key) {
      fixedBlock._key = `fix-b-${Date.now()}-${blockIndex}`
    }

    // Fix children (span)
    if (Array.isArray(fixedBlock.children)) {
      fixedBlock.children = fixedBlock.children.map(
        (child: any, childIndex: number) => {
          const fixedChild = { ...child }
          if (!fixedChild._key) {
            fixedChild._key = `fix-s-${fixedBlock._key}-${childIndex}`
          }
          // Pastikan marks dan _type
          if (!fixedChild._type) fixedChild._type = 'span'
          if (!Array.isArray(fixedChild.marks)) fixedChild.marks = []
          return fixedChild
        }
      )
    }

    // Fix markDefs
    if (!Array.isArray(fixedBlock.markDefs)) {
      fixedBlock.markDefs = []
    }

    return fixedBlock
  })
}

/**
 * Fix bio blocks di author
 */
function fixBioBlocks(bio: any[]): any[] {
  return fixBlockKeys(bio)
}

export async function GET() {
  const logs: string[] = []
  let fixedPosts = 0
  let fixedAuthors = 0

  try {
    // 1. Fix semua posts
    const posts = await client.fetch<any[]>(
      `*[_type == "post"]{ _id, body }`
    )

    for (const post of posts) {
      if (!post.body || !Array.isArray(post.body)) continue

      const needsFix = post.body.some(
        (block: any) =>
          !block._key ||
          !block.children ||
          block.children.some((child: any) => !child._key)
      )

      if (needsFix) {
        const fixedBody = fixBlockKeys(post.body)
        await writeClient
          .patch(post._id)
          .set({ body: fixedBody })
          .commit()
        fixedPosts++
        logs.push(`✅ Fixed post: ${post._id}`)
      }
    }

    // 2. Fix semua authors
    const authors = await client.fetch<any[]>(
      `*[_type == "author"]{ _id, bio }`
    )

    for (const author of authors) {
      if (!author.bio || !Array.isArray(author.bio)) continue

      const needsFix = author.bio.some(
        (block: any) =>
          !block._key ||
          !block.children ||
          block.children.some((child: any) => !child._key)
      )

      if (needsFix) {
        const fixedBio = fixBioBlocks(author.bio)
        await writeClient
          .patch(author._id)
          .set({ bio: fixedBio })
          .commit()
        fixedAuthors++
        logs.push(`✅ Fixed author: ${author._id}`)
      }
    }

    return NextResponse.json({
      message: 'Fix block keys selesai',
      fixedPosts,
      fixedAuthors,
      totalPosts: posts.length,
      totalAuthors: authors.length,
      logs,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, logs },
      { status: 500 }
    )
  }
}
