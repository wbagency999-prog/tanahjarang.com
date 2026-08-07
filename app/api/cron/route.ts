// ═══════════════════════════════════════════════════════════
//  CRON ENDPOINT — Auto-trigger pipeline setiap 15 menit
//  Dipanggil oleh Vercel Cron atau external cron service
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

export async function GET(req: Request) {
  const url = new URL(req.url)
  
  // Auth: verifikasi secret
  const pipelineSecret = process.env.PIPELINE_SECRET || 'tanahjarang-pipeline-2026'
  const secret = url.searchParams.get('secret')
  if (secret !== pipelineSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const logs: string[] = []

  try {
    // ═══ SMART SCHEDULE CHECK ═══
    const hour = new Date().getHours()
    const isPeak = hour >= 6 && hour <= 22
    const maxArticles = isPeak ? 3 : 1 // Lebih banyak artikel di peak hours

    logs.push(`⏰ Cron dimulai — ${hour}:00 WIB (${isPeak ? 'peak' : 'off-peak'})`)
    logs.push(`📋 Max ${maxArticles} artikel`)

    // ═══ GET CATEGORIES & AUTHOR ═══
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

    // ═══ DETECT AI ═══
    const apiKey = process.env.ANTHROPIC_API_KEY || ''
    const skipAI = !apiKey || apiKey.length < 10
    if (skipAI) logs.push('⚠️ AI tidak tersedia')

    // ═══ FETCH RSS (PARALLEL) ═══
    const sources = getSources('indonesia')
    const allArticles = await scrapeAllSources(sources, 5)
    logs.push(`📰 ${allArticles.length} artikel dari ${sources.length} sumber`)

    // ═══ FILTER DUPLIKAT SEKALIGUS ═══
    const newArticles: typeof allArticles = []
    for (const article of allArticles) {
      if (await isDuplicate(article.title, article.link)) {
        continue
      }
      newArticles.push(article)
    }
    logs.push(`🆕 ${newArticles.length} artikel baru (setelah filter duplikat)`)

    // ═══ BREAKING NEWS DETECTION ═══
    const BREAKING_KEYWORDS = [
      'breaking', 'urgent', 'detik ini', 'terkini', 'live', 'langsung',
      'kecelakaan', 'gempa', 'banjir', 'tsunami', 'ledakan', 'tembak',
      'penembakan', 'korban jiwa', 'tewas', 'meninggal dunia',
    ]
    const breakingArticles = newArticles.filter(a => {
      const titleLower = a.title.toLowerCase()
      return BREAKING_KEYWORDS.some(kw => titleLower.includes(kw))
    })
    if (breakingArticles.length > 0) {
      logs.push(`🚨 ${breakingArticles.length} artikel BREAKING NEWS terdeteksi!`)
    }

    // ═══ PRIORITASKAN BREAKING NEWS ═══
    const sortedArticles = [...newArticles].sort((a, b) => {
      const aBreaking = BREAKING_KEYWORDS.some(kw => a.title.toLowerCase().includes(kw))
      const bBreaking = BREAKING_KEYWORDS.some(kw => b.title.toLowerCase().includes(kw))
      if (aBreaking && !bBreaking) return -1
      if (!aBreaking && bBreaking) return 1
      return 0
    })

    let published = 0
    let skipped = 0

    // ═══ PROSES ARTIKEL ═══
    for (const article of sortedArticles) {
      if (published >= maxArticles) {
        logs.push(`✅ Batas ${maxArticles} artikel tercapai`)
        break
      }

      logs.push(`\n📝 [${published + 1}/${maxArticles}] "${article.title.substring(0, 50)}..." dari ${article.sourceName}`)

      // Clean content
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

      // Fetch full content jika pendek
      if (content.length < 500 && article.link) {
        const sourceConfig = sources.find(s => s.name === article.sourceName)
        const selector = sourceConfig?.selectors?.content
        const fetched = await fetchFullContent(article.link, selector)
        if (fetched.content.length > content.length) content = fetched.content
        if (!article.imageUrl && fetched.ogImage) {
          article.imageUrl = fetched.ogImage
        }
      }

      if (content.length < 300) {
        logs.push(`  ⏭️ Skip — konten terlalu pendek (${content.length} char)`)
        skipped++
        continue
      }

      // Run AI pipeline
      const pipelineInput: ArticlePipelineInput = {
        title: article.title,
        content,
        sourceName: article.sourceName,
        originalUrl: article.link,
        imageUrl: article.imageUrl,
        category: article.category,
      }

      const pipelineResult = await runArticlePipeline(pipelineInput, categories, 75, skipAI)

      // Log pipeline results
      for (const log of pipelineResult.logs) {
        logs.push(`  ${log}`)
      }

      // Publish jika lolos QA
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
        logs.push(`  ✅ PUBLISH: "${d.title.substring(0, 50)}..." | QA: ${d.qaScore}`)
      } else {
        skipped++
        logs.push(`  ⏭️ Skip — QA: ${pipelineResult.data.qaScore}`)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    logs.push(`\n🏁 Selesai — ${published} publish, ${skipped} skip | ${duration}s`)

    return NextResponse.json({
      success: published > 0,
      published,
      skipped,
      duration: `${duration}s`,
      logs,
    })
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`)
    return NextResponse.json({ error: error.message, logs }, { status: 500 })
  }
}
