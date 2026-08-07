//  AUTO-PUBLISH STREAM — SSE real-time pipeline progress
//  GET: Stream pipeline progress via Server-Sent Events
// ═══════════════════════════════════════════════════════════

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

export async function GET(req: Request) {
  const url = new URL(req.url)

  // Auth check — same as POST route
  const pipelineSecret = process.env.PIPELINE_SECRET || 'tanahjarang-pipeline-2026'
  const secret = url.searchParams.get('secret')
  if (secret !== pipelineSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const mode = (url.searchParams.get('mode') || 'indonesia') as 'all' | 'indonesia' | 'international'
  const maxArticles = Math.min(10, Math.max(1, parseInt(url.searchParams.get('maxArticles') || '2')))

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const startTime = Date.now()

      try {
        // Auth check (via query param for SSE)
        // SSE doesn't support headers easily, so we use a simple check
        send('start', { message: 'Pipeline dimulai', mode, maxArticles })

        // Get categories & author
        const categories: SanityCategory[] = await client.fetch(
          `*[_type == "category" && defined(slug.current)]{ _id, title, slug }`
        )
        send('status', { step: 1, message: `${categories.length} kategori ditemukan` })

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

        // Detect AI
        const apiKey = process.env.ANTHROPIC_API_KEY || ''
        const skipAI = !apiKey || apiKey.length < 10
        send('status', { step: 2, message: skipAI ? 'AI tidak tersedia' : 'AI aktif' })

        // Scrape RSS
        send('status', { step: 3, message: 'Mengambil artikel dari RSS...' })
        const sources = getSources(mode)
        const allArticles = await scrapeAllSources(sources, 5)
        send('status', { step: 3, message: `${allArticles.length} artikel dari ${sources.length} sumber` })

        let published = 0
        let skipped = 0
        let processed = 0

        for (const article of allArticles) {
          if (published >= maxArticles) {
            send('status', { step: 4, message: `Batas ${maxArticles} artikel tercapai` })
            break
          }

          // Dedup check
          if (await isDuplicate(article.title, article.link)) {
            send('skip', { title: article.title.substring(0, 60), reason: 'duplikat' })
            continue
          }

          processed++
          send('process', {
            index: processed,
            title: article.title.substring(0, 60),
            source: article.sourceName,
            total: maxArticles,
            published,
          })

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

          // Fetch full content jika RSS hanya memberikan excerpt pendek
          if (content.length < 500 && article.link) {
            const sourceConfig = sources.find(s => s.name === article.sourceName)
            const selector = sourceConfig?.selectors?.content
            const fetched = await fetchFullContent(article.link, selector)
            if (fetched.content.length > content.length) content = fetched.content
            if (!article.imageUrl && fetched.ogImage) {
              article.imageUrl = fetched.ogImage
            }
          }

          // Skip artikel dengan konten terlalu pendek SETELAH fetch
          if (content.length < 300) {
            send('skip', { title: article.title.substring(0, 60), reason: `konten terlalu pendek (${content.length} char)` })
            skipped++
            continue
          }

          // Run AI pipeline
          send('pipeline', { stage: 'rewrite', message: 'AI Rewrite...' })
          const pipelineInput: ArticlePipelineInput = {
            title: article.title,
            content,
            sourceName: article.sourceName,
            originalUrl: article.link,
            imageUrl: article.imageUrl,
            category: article.category,
          }

          const pipelineResult = await runArticlePipeline(pipelineInput, categories, 85, skipAI)

          // Send pipeline logs
          for (const log of pipelineResult.logs) {
            send('pipeline-log', { message: log })
          }

          // Publish
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
            send('published', {
              title: d.title.substring(0, 60),
              qa: d.qaScore,
              seo: d.seoScore,
              published,
              total: maxArticles,
            })
          } else {
            skipped++
            send('skipped', {
              title: article.title.substring(0, 60),
              qa: pipelineResult.data.qaScore,
              reason: pipelineResult.data.qaScore < 85 ? 'QA score rendah' : 'pipeline gagal',
            })
          }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)
        send('done', {
          published,
          skipped,
          processed,
          total: allArticles.length,
          duration: `${duration}s`,
        })
      } catch (error: any) {
        send('error', { message: error.message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
