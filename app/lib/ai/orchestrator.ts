// ═══════════════════════════════════════════════════════════
//  PIPELINE ORCHESTRATOR — Mengatur urutan semua agent
//  Tahap 1-3 dilakukan di caller (source, cleaner, dedup)
//  Tahap 4-10 dilakukan di sini
// ═══════════════════════════════════════════════════════════

import { rewriteArticle, classifyCategory } from '@/app/lib/ai/rewriter'
import { generateSEO, calculateSEOScoreFallback } from '@/app/lib/ai/seo-optimizer'
import { editArticle } from '@/app/lib/ai/agents/copy-editor'
import { runQA, type QAResult } from '@/app/lib/ai/agents/qa-agent'
import { factCheck } from '@/app/lib/ai/agents/fact-checker'
import { createFallbackBody, toSanityBlocks } from '@/app/lib/utils'
import type { SanityBlock } from '@/app/lib/types'

/**
 * Pola attribution yang dideteksi untuk link ke sumber
 */
const ATTRIBUTION_PATTERNS = [
  'Dikutip dari',
  'Dilansir dari',
  'Dikuti dari',
  'Sumber:',
  'Sumber :',
  'Berdasarkan data',
  'Berdasarkan informasi dari',
  'Seperti dilansir',
  'Sebagaimana dilaporkan',
]

/**
 * Post-process: tambahkan link pada attribution text di body blocks
 * Mendeteksi berbagai variasi: "Dikutip dari", "Dilansir dari", "Sumber:", dll.
 * Mengkonversi teks plain menjadi PortableText dengan annotation mark (link)
 */
function addSourceAttributionLink(
  body: SanityBlock[],
  sourceName: string,
  originalUrl: string
): SanityBlock[] {
  if (!sourceName || !originalUrl) return body

  return body.map((block) => {
    if (block._type !== 'block' || !block.children) return block

    // Cari pattern yang cocok di salah satu child span
    let matchedPattern: string | null = null
    let matchedChild: any = null

    for (const child of block.children) {
      if (!child.text) continue
      const childTextLower = child.text.toLowerCase()
      for (const pattern of ATTRIBUTION_PATTERNS) {
        const searchKey = `${pattern} ${sourceName}`
        const searchKeyLower = searchKey.toLowerCase()
        const idx = childTextLower.indexOf(searchKeyLower)
        if (idx !== -1) {
          matchedPattern = child.text.substring(idx, idx + searchKey.length)
          matchedChild = child
          break
        }
      }
      if (matchedPattern) break
    }

    if (!matchedPattern || !matchedChild) return block

    const newChildren: any[] = []
    let processed = false

    for (const child of block.children) {
      if (processed || !child.text?.includes(matchedPattern!)) {
        newChildren.push(child)
        continue
      }

      const idx = child.text.indexOf(matchedPattern!)
      const before = child.text.substring(0, idx)
      const patternPart = matchedPattern! + ' '

      // Teks sebelum pattern + pattern name
      newChildren.push({
        _type: 'span',
        _key: `${child._key}-pre`,
        text: before + patternPart,
        marks: child.marks || [],
      })

      // Source name dengan LINK
      newChildren.push({
        _type: 'span',
        _key: `${child._key}-link`,
        text: sourceName,
        marks: [
          ...(child.marks || []),
          {
            _type: 'link',
            href: originalUrl,
            target: '_blank',
            rel: 'nofollow noopener noreferrer',
          },
        ],
      })

      // Teks setelah sourceName
      const afterIdx = idx + matchedPattern!.length + sourceName.length
      const after = child.text.substring(afterIdx)
      if (after) {
        newChildren.push({
          _type: 'span',
          _key: `${child._key}-post`,
          text: after,
          marks: child.marks || [],
        })
      }

      processed = true
    }

    return {
      ...block,
      children: newChildren,
      markDefs: [
        ...(block.markDefs || []),
        {
          _type: 'link',
          _key: `link-${block._key}`,
          href: originalUrl,
          target: '_blank',
          rel: 'nofollow noopener noreferrer',
        },
      ],
    }
  })
}

export interface ArticlePipelineInput {
  title: string
  content: string
  sourceName: string
  originalUrl: string
  imageUrl: string | null
  category: string
  imageCaption?: string
}

export interface ArticlePipelineResult {
  success: boolean
  published: boolean
  data: {
    title: string
    subtitle: string
    excerpt: string
    body: SanityBlock[]
    tags: string[]
    metaTitle: string
    metaDescription: string
    categorySlug: string
    seoScore: number
    qaScore: number
    qaPass: boolean
    factCheckConfidence: number
    originalUrl: string
    sourceName: string
    imageCaption: string
  }
  logs: string[]
  aiSkipped: boolean
}
/**
 * Orchestrator: Jalankan full AI pipeline untuk 1 artikel
 *
 * Tahap 1: Source (dilakukan di caller)
 * Tahap 2: Content Cleaner (dilakukan di scraper)
 * Tahap 3: Dedup Checker (dilakukan di caller)
 * Tahap 4: Writer Agent (AI Rewrite + retry)
 * Tahap 5: Kategorisasi (SEBELUM QA — agar QA dinilai dengan konteks yang benar)
 * Tahap 6: SEO Agent
 * Tahap 7: Editor (Copy Edit + Proofread merged)
 * Tahap 8: Fact Checker (verifikasi fakta + penalty)
 * Tahap 9: QA Agent (evaluasi kualitas — SETELAH semua proses)
 * Tahap 10: Publisher (dilakukan oleh caller)
 */
export async function runArticlePipeline(
  article: ArticlePipelineInput,
  categories: { title: string; slug: { current: string } | string }[],
  minQAScore: number = 75,
  skipAI: boolean = false
): Promise<ArticlePipelineResult> {
  const logs: string[] = []

  const result: ArticlePipelineResult = {
    success: false,
    published: false,
    data: {
      title: article.title,
      subtitle: '',
      excerpt: article.content.substring(0, 200),
      body: [],
      tags: [],
      metaTitle: '',
      metaDescription: '',
      categorySlug: article.category,
      seoScore: 0,
      qaScore: 0,
      qaPass: false,
      factCheckConfidence: 0,
      originalUrl: article.originalUrl,
      sourceName: article.sourceName,
      imageCaption: '',
    },
    logs,
    aiSkipped: skipAI,
  }

  try {
    // ═══ TAHAP 4: WRITER AGENT ═══
    logs.push(`✍️ Tahap 4: Writer Agent — ${skipAI ? 'skip (AI unavailable)' : 'rewrite artikel...'}`)

    if (!skipAI) {
      let rewritten = await rewriteArticle(
        article.title,
        article.content,
        article.sourceName
      )

      // Retry 1x jika rewrite gagal
      if (!rewritten) {
        logs.push('  ⚠️ Rewrite gagal, retry...')
        rewritten = await rewriteArticle(
          article.title,
          article.content,
          article.sourceName
        )
      }

      if (rewritten) {
        result.data.title = rewritten.title
        result.data.subtitle = rewritten.subtitle
        result.data.excerpt = rewritten.excerpt
        result.data.body = rewritten.body
        result.data.tags = rewritten.tags
        logs.push(`  ✅ Rewrite berhasil: "${rewritten.title.substring(0, 50)}..."`)
      } else {
        result.data.body = createFallbackBody(article.content, 'rewrite-fb')
        logs.push('  ⚠️ Rewrite gagal, menggunakan konten asli')
      }
    } else {
      result.data.body = createFallbackBody(article.content, 'skipai')
      result.data.tags = [article.sourceName, article.category]
      logs.push('  ⏭️ AI skipped, menggunakan konten asli')
    }

    // ═══ TAHAP 4.5: TAMBAHKAN LINK ATTRIBUTION ═══
    // Post-process: tambahkan link pada "Dikutip dari [sourceName]" di body blocks
    if (result.data.body.length > 0 && article.originalUrl && article.sourceName) {
      result.data.body = addSourceAttributionLink(
        result.data.body,
        article.sourceName,
        article.originalUrl
      )
      logs.push(`  🔗 Source attribution link ditambahkan`)
    }

    // ═══ TAHAP 5: KATEGORISASI (SEBELUM QA) ═══
    if (!skipAI) {
      logs.push('📂 Tahap 5: Kategorisasi...')

      const bodyText = result.data.body
        .map((b: any) => b.children?.map((c: any) => c.text).join(' ') || '')
        .join(' ')

      const aiCategory = await classifyCategory(
        result.data.title,
        bodyText || article.content,
        categories
      )
      if (aiCategory) {
        result.data.categorySlug = aiCategory
        logs.push(`  📂 Kategori: ${aiCategory}`)
      } else {
        logs.push(`  ⚠️ Kategori tidak terdeteksi, menggunakan default: ${article.category}`)
      }
    } else {
      logs.push(`  ⏭️ Kategorisasi: ${result.data.categorySlug} (default dari sumber)`)
    }

    // ═══ TAHAP 6: SEO AGENT ═══
    logs.push(`🔍 Tahap 6: SEO Agent — ${skipAI ? 'fallback' : 'optimasi metadata...'}`)

    // Reuse bodyText dari tahap 5 atau compute baru
    const seoBodyText = result.data.body
      .map((b: any) => b.children?.map((c: any) => c.text).join(' ') || '')
      .join(' ')

    if (!skipAI) {
      const seoData = await generateSEO(
        result.data.title,
        result.data.subtitle,
        result.data.excerpt,
        seoBodyText || article.content
      )

      if (seoData) {
        result.data.metaTitle = seoData.metaTitle
        result.data.metaDescription = seoData.metaDescription
        result.data.tags = [...new Set([...result.data.tags, ...seoData.keywords])]
        result.data.seoScore = seoData.seoScore
        logs.push(`  ✅ SEO Score: ${seoData.seoScore}/100`)
      } else {
        result.data.metaTitle = result.data.title.substring(0, 60)
        result.data.metaDescription = result.data.excerpt.substring(0, 160)
        result.data.seoScore = calculateSEOScoreFallback({
          title: result.data.title,
          excerpt: result.data.excerpt,
          tags: result.data.tags,
        })
        logs.push(`  ⚠️ SEO fallback: ${result.data.seoScore}/100`)
      }
    } else {
      result.data.metaTitle = result.data.title.substring(0, 60)
      result.data.metaDescription = result.data.excerpt.substring(0, 160)
      result.data.seoScore = calculateSEOScoreFallback({
        title: result.data.title,
        excerpt: result.data.excerpt,
        tags: result.data.tags,
      })
        logs.push(`  ⏭️ AI skipped, SEO basic: ${result.data.seoScore}/100`)
      }

    // ═══ TAHAP 6.5: IMAGE CAPTION ═══
    // Generate caption: "Deskripsi gambar | Foto: [sourceName]"
    const altText = result.data.metaTitle || result.data.subtitle || result.data.title
    if (article.sourceName) {
      result.data.imageCaption = `${altText} | Foto: ${article.sourceName}`
      logs.push(`  🖼️ Image caption: "${result.data.imageCaption.substring(0, 60)}..."`)
    }

    // ═══ TAHAP 7: EDITOR (Copy Edit + Proofread) ═══
    if (!skipAI) {
      logs.push('📝 Tahap 7: Editor — perbaiki flow, readability & typo...')

      const bodyWithStyle = result.data.body.map((b: any) => ({
        style: b.style || 'normal',
        text: b.children?.map((c: any) => c.text).join(' ') || '',
      }))

      const editorResult = await editArticle({
        title: result.data.title,
        subtitle: result.data.subtitle,
        excerpt: result.data.excerpt,
        body: bodyWithStyle,
        tags: result.data.tags,
      })

      if (editorResult) {
        result.data.title = editorResult.title
        result.data.subtitle = editorResult.subtitle
        result.data.excerpt = editorResult.excerpt
        result.data.body = toSanityBlocks(
          editorResult.body
            .filter((block: any) => block && block.text)
            .map((block: any) => ({
              text: String(block.text || ''),
              style: block.style || 'normal',
            })),
          'ed'
        )
        logs.push(`  ✅ Editor selesai (${editorResult.fixes.length} perubahan)`)
      } else {
        logs.push('  ⚠️ Editor gagal, menggunakan hasil sebelumnya')
      }
    } else {
      logs.push('  ⏭️ Editor skipped')
    }

    // ═══ TAHAP 8: FACT CHECKER ═══
    if (!skipAI) {
      logs.push('🔍 Tahap 8: Fact Checker — verifikasi fakta...')

      const finalBodyText = result.data.body
        .map((b: any) => b.children?.map((c: any) => c.text).join(' ') || '')
        .join(' ')

      const factResult = await factCheck(
        result.data.title,
        finalBodyText,
        article.content
      )

      result.data.factCheckConfidence = factResult.confidence
      logs.push(`  📋 Fact Check: ${factResult.confidence}% confidence ${factResult.verified ? '✅' : '⚠️'}`)

      if (factResult.warnings.length > 0) {
        logs.push(`  ⚠️ Warnings: ${factResult.warnings.join('; ')}`)
      }

      // Penalty: jika fact check confidence rendah, potong QA score
      if (factResult.confidence < 30) {
        result.data.qaScore = Math.max(0, result.data.qaScore - 25)
        logs.push(`  🚨 QA score dipotong 25 (fact check confidence sangat rendah: ${factResult.confidence}%)`)
      } else if (factResult.confidence < 50) {
        result.data.qaScore = Math.max(0, result.data.qaScore - 15)
        logs.push(`  ⚠️ QA score dipotong 15 (fact check confidence rendah: ${factResult.confidence}%)`)
      } else if (factResult.confidence < 70) {
        result.data.qaScore = Math.max(0, result.data.qaScore - 5)
        logs.push(`  ⚠️ QA score dipotong 5 (fact check confidence cukup: ${factResult.confidence}%)`)
      }
    } else {
      result.data.factCheckConfidence = 50
      logs.push('  ⏭️ Fact Checker skipped')
    }

    // ═══ TAHAP 9: QA AGENT (SETELAH semua proses) ═══
    if (!skipAI) {
      logs.push('✅ Tahap 9: QA Agent — evaluasi kualitas...')

      const finalBodyText = result.data.body
        .map((b: any) => b.children?.map((c: any) => c.text).join(' ') || '')
        .join(' ')

      let qaResult = await runQA({
        title: result.data.title,
        subtitle: result.data.subtitle,
        excerpt: result.data.excerpt,
        bodyText: finalBodyText,
        tags: result.data.tags,
        metaTitle: result.data.metaTitle,
        metaDescription: result.data.metaDescription,
      }, minQAScore)

      // Auto-retry: jika QA score rendah, coba sekali lagi dengan editor yang lebih ketat
      if (!qaResult.pass && qaResult.score > 0 && qaResult.score < minQAScore) {
        logs.push(`  🔄 Auto-retry: QA score ${qaResult.score} < ${minQAScore}, mencoba perbaikan...`)

        // Jalankan editor lagi dengan prompt lebih ketat
        const retryBodyWithStyle = result.data.body.map((b: any) => ({
          style: b.style || 'normal',
          text: b.children?.map((c: any) => c.text).join(' ') || '',
        }))

        const retryEditorResult = await editArticle({
          title: result.data.title,
          subtitle: result.data.subtitle,
          excerpt: result.data.excerpt,
          body: retryBodyWithStyle,
          tags: result.data.tags,
        })

        if (retryEditorResult) {
          result.data.body = toSanityBlocks(
            retryEditorResult.body
              .filter((block: any) => block && block.text)
              .map((block: any) => ({
                text: String(block.text || ''),
                style: block.style || 'normal',
              })),
            'ed-retry'
          )

          // Re-run QA
          const retryBodyText = result.data.body
            .map((b: any) => b.children?.map((c: any) => c.text).join(' ') || '')
            .join(' ')

          qaResult = await runQA({
            title: result.data.title,
            subtitle: result.data.subtitle,
            excerpt: result.data.excerpt,
            bodyText: retryBodyText,
            tags: result.data.tags,
            metaTitle: result.data.metaTitle,
            metaDescription: result.data.metaDescription,
          }, minQAScore)

          logs.push(`  📊 QA Score (retry): ${qaResult.score}/100 ${qaResult.pass ? '✅ PASS' : '❌ FAIL'}`)
        }
      }

      result.data.qaScore = qaResult.score
      result.data.qaPass = qaResult.pass
      logs.push(`  📊 QA Score: ${qaResult.score}/100 ${qaResult.pass ? '✅ PASS' : '❌ FAIL'}`)

      if (qaResult.issues.length > 0) {
        logs.push(`  ⚠️ Issues: ${qaResult.issues.join('; ')}`)
      }
    } else {
      // SkipAI mode: QA tetap jalan dengan basic check
      result.data.qaScore = 70
      result.data.qaPass = 70 >= minQAScore
      if (!result.data.qaPass) {
        logs.push(`  ⚠️ QA Score: 70/100 (AI skipped) — di bawah minimum ${minQAScore}, artikel TIDAK dipublish`)
      } else {
        logs.push(`  📊 QA Score: 70/100 (AI skipped, basic check)`)
      }
    }

    // ═══ HASIL ═══
    result.success = true
    result.published = result.data.qaPass

    if (!result.data.qaPass) {
      logs.push(`  ⚠️ Artikel tidak dipublish (QA score ${result.data.qaScore} < ${minQAScore})`)
    }

    return result
  } catch (error: any) {
    logs.push(`❌ Error pipeline: ${error.message}`)
    return result
  }
}
