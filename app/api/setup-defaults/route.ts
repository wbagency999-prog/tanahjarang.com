// ═══════════════════════════════════════════════════════════
//  SETUP DEFAULTS — Auto-create author & kategori untuk pipeline
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/writeClient'
import { client } from '@/sanity/client'

export const dynamic = 'force-dynamic'

const DEFAULT_AUTHOR = {
  _type: 'author',
  name: 'Warta Nusantara',
  slug: { _type: 'slug', current: 'warta-nusantara' },
  bio: [
    {
      _type: 'block',
      _key: 'bio',
      style: 'normal',
      children: [{ _type: 'span', _key: 'bio-text', text: 'AI News Aggregator — Portal Berita Otomatis' }],
      markDefs: [],
    },
  ],
  verified: true,
}

const DEFAULT_CATEGORIES = [
  { title: 'Nasional', slug: 'nasional', description: 'Berita dalam negeri Indonesia' },
  { title: 'Internasional', slug: 'internasional', description: 'Berita dunia internasional' },
  { title: 'Teknologi', slug: 'teknologi', description: 'Berita teknologi dan digital' },
  { title: 'Olahraga', slug: 'olahraga', description: 'Berita olahraga' },
  { title: 'Hiburan', slug: 'hiburan', description: 'Berita hiburan dan selebriti' },
  { title: 'Bisnis', slug: 'bisnis', description: 'Berita bisnis, ekonomi, dan finansial' },
  { title: 'Pendidikan', slug: 'pendidikan', description: 'Berita pendidikan' },
]

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const pipelineSecret = process.env.PIPELINE_SECRET
  if (!pipelineSecret || secret !== pipelineSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs: string[] = []

  // 1. Setup default author
  const existingAuthor = await client.fetch(
    `*[_type == "author" && slug.current == "warta-nusantara"][0]._id`
  )

  let authorId = existingAuthor
  if (!existingAuthor) {
    const author = await writeClient.create(DEFAULT_AUTHOR)
    authorId = author._id
    logs.push(`✅ Author "Warta Nusantara" dibuat: ${authorId}`)
  } else {
    logs.push(`ℹ️ Author "Warta Nusantara" sudah ada: ${existingAuthor}`)
  }

  // 2. Setup default categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await client.fetch(
      `count(*[_type == "category" && slug.current == $slug])`,
      { slug: cat.slug }
    )
    if (existing === 0) {
      await writeClient.create({
        _type: 'category',
        title: cat.title,
        slug: { _type: 'slug', current: cat.slug },
        description: cat.description,
      })
      logs.push(`✅ Kategori "${cat.title}" dibuat`)
    } else {
      logs.push(`ℹ️ Kategori "${cat.title}" sudah ada`)
    }
  }

  return NextResponse.json({
    message: 'Setup defaults selesai',
    authorId,
    logs,
  })
}
