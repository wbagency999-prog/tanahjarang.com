// ═══════════════════════════════════════════════════════════
//  AUTO-PUBLISH — Batch processing, smart scheduling
//  GET: Status & stats | POST: Trigger pipeline
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { client } from '@/sanity/client'
import { writeClient } from '@/sanity/writeClient'
import { getSources } from '@/app/lib/scraper/sources'
import { scrapeAllSources, fetchFullContent } from '@/app/lib/scraper/scraper'
import { runArticlePipeline, type ArticlePipelineInput } from '@/app/lib/ai/orchestrator'
import { isDuplicate, generateSlug } from '@/app/lib/utils'

export const dynamic = 'force-dynamic'

interface SanityCategory {
  _id: string
  title: string
  slug: { current: string }
}

// Mapping kategori → author slug (berdasarkan spesialisasi)
const CATEGORY_AUTHOR_MAP: Record<string, string> = {
  'nasional': 'anisa-permata',
  'internasional': 'rizky-aditya',
  'teknologi': 'siti-rahmawati',
  'olahraga': 'dewi-anggraini',
  'hiburan': 'hendra-wijaya',
  'bisnis': 'budi-prasetyo',
  'pendidikan': 'dimas-kurniawan',
  'pertambangan': 'farhan-hakim',
}

// ═══════════════════════════════════════════════════════════
//  IMAGE UPLOAD
// ═══════════════════════════════════════════════════════════

async function uploadImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const asset = await writeClient.assets.upload('image', buffer, {
      filename: `article-${Date.now()}.jpg`,
    })
    return asset._id
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════
//  SMART BATCH PROCESSING
// ═══════════════════════════════════════════════════════════

async function processBatch(
  categories: SanityCategory[],
  authorRef: string,
  mode: 'all' | 'indonesia' | 'international',
  minQAScore: number,
  maxArticles: number
): Promise<{ published: number; skipped: number; total: number; logs: string[] }> {
  const logs: string[] = []
  const sources = getSources(mode)

  // Detect if AI is available
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  const skipAI = !apiKey || apiKey.length < 10
  if (skipAI) logs.push('Anthropic API key tidak valid — mode tanpa AI aktif')

  // Tahap 1: Ambil artikel dari RSS secara PARALEL
  const allArticles = await scrapeAllSources(sources, 5)
  logs.push(`Tahap 1: ${allArticles.length} artikel dari ${sources.length} sumber`)

  let published = 0
  let skipped = 0

  for (const article of allArticles) {
    // Jika sudah mencapai batas, hentikan
    if (published >= maxArticles) {
      logs.push(`Batas ${maxArticles} artikel tercapai, stop`)
      break
    }

    // Tahap 3: Cek duplikat
    if (await isDuplicate(article.title, article.link)) {
      continue
    }

    logs.push(`Memproses: "${article.title.substring(0, 60)}..." dari ${article.sourceName}`)

    // Tahap 2: Content Cleaner
    let content = article.content || article.description
    content = content
      .replace(/ADVERTISEMENT/gi, '')
      .replace(/SCROLL TO CONTINUE WITH CONTENT/gi, '')
      .replace(/Pilihan Redaksi[\s\S]*$/gi, '')
      .replace(/Baca Juga[\s\S]*$/gi, '')
      .replace(/Berita Terkait[\s\S]*$/gi, '')
      .replace(/\[Gambas[^\]]*\]/gi, '')
      .replace(/\(ikw\/[\w\/]+\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Fetch full content jika RSS hanya memberikan excerpt pendek
    if (content.length < 500 && article.link) {
      const sourceConfig = sources.find(s => s.name === article.sourceName)
      const selector = sourceConfig?.selectors?.content
      const fetched = await fetchFullContent(article.link, selector)
      if (fetched.content.length > content.length) content = fetched.content
      // Fallback: gunakan OG image jika tidak ada gambar dari RSS
      if (!article.imageUrl && fetched.ogImage) {
        article.imageUrl = fetched.ogImage
      }
    }

    // Skip artikel dengan konten terlalu pendek SETELAH fetch (galeri foto, video, dll)
    if (content.length < 300) {
      logs.push(`  ⏭️ Skip: "${article.title.substring(0, 60)}..." — konten terlalu pendek (${content.length} char)`)
      skipped++
      continue
    }

    // Jalankan AI pipeline (Tahap 4-9)
    const pipelineInput: ArticlePipelineInput = {
      title: article.title,
      content,
      sourceName: article.sourceName,
      imageCaption: article.imageCaption,
      originalUrl: article.link,
      imageUrl: article.imageUrl,
      category: article.category,
    }

    const pipelineResult = await runArticlePipeline(pipelineInput, categories, minQAScore, skipAI)

    // Tahap 10: Publisher
    if (pipelineResult.success && pipelineResult.published) {
      const d = pipelineResult.data

      let imageAsset: any = undefined
      if (article.imageUrl) {
        const assetId = await uploadImage(article.imageUrl)
        if (assetId) {
          imageAsset = { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
        }
      }

      const matchedCategory = categories.find(c => c.slug.current === d.categorySlug)

      // Match author berdasarkan kategori artikel
      const articleAuthorSlug = CATEGORY_AUTHOR_MAP[d.categorySlug]
      const articleAuthorRef = articleAuthorSlug
        ? await client.fetch<string | null>(`*[_type == "author" && slug.current == $slug][0]._id`, { slug: articleAuthorSlug })
        : null

      const doc: Record<string, any> = {
        _type: 'post',
        title: d.title,
        slug: { _type: 'slug', current: generateSlug(d.title) || generateSlug(article.title) },
        subtitle: d.subtitle,
        excerpt: d.excerpt,
        body: d.body,
        publishedAt: new Date().toISOString(),
        tags: d.tags.slice(0, 10),
        metaTitle: d.metaTitle.substring(0, 60),
        metaDescription: d.metaDescription.substring(0, 160),
        originalUrl: d.originalUrl,
        sourceName: d.sourceName,
        imageCaption: d.imageCaption,
        aiRewritten: !skipAI,
        seoScore: d.seoScore,
        qaScore: d.qaScore,
        views: 0,
        amp: 'tidak',
        komentarPembaca: 'iya',
        factCheck: 'default',
        tableOfContent: 'tidak',
        author: { _type: 'reference', _ref: articleAuthorRef || authorRef },
      }

      if (matchedCategory) {
        doc.categories = [{ _type: 'reference', _ref: matchedCategory._id }]
      } else if (categories.length > 0) {
        doc.categories = [{ _type: 'reference', _ref: categories[0]._id }]
      }

      if (imageAsset) {
        doc.mainImage = imageAsset
      }

      await writeClient.create(doc as any)
      published++
      logs.push(`PUBLISH [${published}/${maxArticles}]: "${d.title.substring(0, 50)}..." | QA: ${d.qaScore} | SEO: ${d.seoScore}`)
    } else {
      skipped++
    }
  }

  const total = published + skipped
  logs.push(`Selesai: ${published} publish, ${skipped} skip dari ${allArticles.length} artikel`)

  return { published, skipped, total, logs }
}

// ═══════════════════════════════════════════════════════════
//  GET — Status & stats
// ═══════════════════════════════════════════════════════════

export async function GET() {
  const totalPosts = await client.fetch<number>(`count(*[_type == "post"])`)
  const aiPosts = await client.fetch<number>(`count(*[_type == "post" && aiRewritten == true])`)
  const recentPosts = await client.fetch<any[]>(
    `*[_type == "post"] | order(publishedAt desc)[0...10]{ title, publishedAt, sourceName, seoScore, qaScore, aiRewritten }`
  )

  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  const aiAvailable = apiKey.length >= 10

  // Smart schedule info
  const hour = new Date().getHours()
  const isPeak = hour >= 6 && hour <= 22

  return NextResponse.json({
    message: 'Auto-Publish Pipeline — Warta Nusantara',
    status: 'active',
    aiStatus: aiAvailable ? 'available' : 'unavailable (API key missing)',
    schedule: {
      currentHour: `${hour}:00 WIB`,
      isPeakHour: isPeak,
      recommendedInterval: isPeak ? '5 menit' : '15 menit',
    },
    stats: { totalPosts, aiRewrittenPosts: aiPosts, humanPosts: totalPosts - aiPosts },
    recentPosts,
    pipeline: [
      '1. Source Agent — Ambil dari RSS (paralel)',
      '2. Content Cleaner — Bersihkan junk',
      '3. Dedup Checker — Cek duplikat',
      '4. Writer Agent — AI Rewrite (with retry)',
      '5. Kategorisasi — AI classify',
      '6. SEO Agent — Meta optimization',
      '7. Editor — Copy edit + Proofread',
      '8. Fact Checker — Verifikasi fakta',
      '9. QA Agent — Skor kualitas',
      '10. Publisher — Upload & publish',
    ],
    usage: {
      GET: 'Status & statistik',
      POST: 'Jalankan pipeline (butuh secret)',
    },
    bodyParams: {
      secret: 'tanahjarang-pipeline-2026',
      mode: 'all | indonesia | international (default: indonesia)',
      minScore: 'number — minimum QA score (default: 85)',
      maxArticles: 'number — max artikel per trigger (default: 2, max: 5)',
    },
  })
}

// ═══════════════════════════════════════════════════════════
//  POST — Trigger pipeline
// ═══════════════════════════════════════════════════════════

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const pipelineSecret = process.env.PIPELINE_SECRET || 'tanahjarang-pipeline-2026'
    if (body.secret !== pipelineSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mode = body.mode || 'indonesia'
    const minScore = body.minScore !== undefined ? body.minScore : 85
    const maxArticles = Math.min(5, Math.max(1, parseInt(body.maxArticles) || 2))

    console.log(`\n${'='.repeat(60)}`)
    console.log(`AUTO-PUBLISH — Mode: ${mode} | Min QA: ${minScore} | Max: ${maxArticles} articles`)
    console.log(`${'='.repeat(60)}\n`)

    const startTime = Date.now()

    // Ambil categories & author
    const categories: SanityCategory[] = await client.fetch(
      `*[_type == "category" && defined(slug.current)]{ _id, title, slug }`
    )

    let authorRef: string
    const existingAuthor = await client.fetch<{ _id: string } | null>(
      `*[_type == "author" && slug.current == "warta-nusantara"][0]{ _id }`
    )
    if (existingAuthor) {
      authorRef = existingAuthor._id
    } else {
      const newAuthor = await writeClient.create({
        _type: 'author',
        name: 'Warta Nusantara',
        slug: { _type: 'slug', current: 'warta-nusantara' },
        bio: [{ _type: 'block', _key: 'bio', style: 'normal', children: [{ _type: 'span', _key: 'bio-text', text: 'AI News Aggregator' }], markDefs: [] }],
        verified: true,
      })
      authorRef = newAuthor._id
    }

    // Proses batch artikel
    const result = await processBatch(categories, authorRef, mode, minScore, maxArticles)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`\nAUTO-PUBLISH selesai — ${duration}s | Published: ${result.published}\n`)

    return NextResponse.json({
      success: result.published > 0,
      published: result.published,
      skipped: result.skipped,
      duration: `${duration}s`,
      logs: result.logs,
    })
  } catch (error: any) {
    console.error('[AutoPublish] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
