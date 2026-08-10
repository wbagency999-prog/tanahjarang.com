import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { client } from '@/sanity/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { docId, slug, secret } = body

    const pipelineSecret = process.env.PIPELINE_SECRET
    if (!pipelineSecret || secret !== pipelineSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revalidate homepage
    revalidatePath('/')

    // Revalidate article pages (covers both category-based and /berita/ routes)
    if (slug) {
      revalidatePath(`/berita/${slug}`)
    }
    // Look up category from Sanity to revalidate the correct path
    if (docId) {
      const post = await client.fetch<{ categories?: { slug?: { current?: string } }[] }>(
        `*[_type == "post" && _id == $docId][0]{ categories[]->{ slug } }`,
        { docId }
      )
      const categorySlug = post?.categories?.[0]?.slug?.current
      if (categorySlug) {
        revalidatePath(`/${categorySlug}/${slug}`)
        revalidatePath(`/${categorySlug}`)
      }
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      docId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Revalidation failed', details: String(err) },
      { status: 500 }
    )
  }
}
