//  MIGRATE CATEGORIES — Rename Finansial → Bisnis, Delete Kesehatan
// POST: Jalankan migrasi | GET: Lihat status
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { client } from '@/sanity/client'
import { writeClient } from '@/sanity/writeClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Lihat semua kategori yang ada
  const categories = await client.fetch<any[]>(
    `*[_type == "category"]{ _id, title, slug, description }`
  )
  return NextResponse.json({ categories })
}

export async function POST() {
  const logs: string[] = []

  try {
    // 1. Cari kategori "Finansial" → rename ke "Bisnis"
    const finansial = await client.fetch<{ _id: string } | null>(
      `*[_type == "category" && (title == "Finansial" || slug.current == "finansial")][0]{ _id }`
    )

    if (finansial) {
      await writeClient.patch(finansial._id).set({
        title: 'Bisnis',
        slug: { current: 'bisnis' },
        description: 'Berita bisnis, ekonomi, dan finansial',
      }).commit()
      logs.push('✅ "Finansial" → renamed ke "Bisnis"')
    } else {
      logs.push('ℹ️ Kategori "Finansial" tidak ditemukan')
    }

    // 2. Cari kategori "Kesehatan" → hapus
    const kesehatan = await client.fetch<{ _id: string } | null>(
      `*[_type == "category" && (title == "Kesehatan" || slug.current == "kesehatan")][0]{ _id }`
    )

    if (kesehatan) {
      // Cek artikel yang pakai kategori ini
      const articlesCount = await client.fetch<number>(
        `count(*[_type == "post" && references($id)])`,
        { id: kesehatan._id }
      )
      logs.push(`📋 ${articlesCount} artikel menggunakan kategori "Kesehatan"`)

      // Pindahkan artikel ke "Nasional" sebagai default
      if (articlesCount > 0) {
        const nasional = await client.fetch<{ _id: string } | null>(
          `*[_type == "category" && slug.current == "nasional"][0]{ _id }`
        )
        if (nasional) {
          // Fetch semua artikel (termasuk drafts) + categories mereka
          const articles = await client.fetch<{ _id: string; categories: { _ref: string }[] }[]>(
            `*[_type == "post" && references($id)]{ _id, categories[] { _ref } }`,
            { id: kesehatan._id }
          )
          
          // Juga fetch draft versions
          const drafts = await client.fetch<any[]>(
            `*[_type == "post" && references($id)]{ "draftId": "drafts." + _id, categories[] { _ref } }`,
            { id: kesehatan._id }
          )

          // Update published versions
          for (const article of articles) {
            const newCategories = (article.categories || [])
              .filter((c: any) => c._ref !== kesehatan._id)
              .map((c: any) => ({ _type: 'reference', _ref: c._ref }))
            
            const hasNasional = newCategories.some((c: any) => c._ref === nasional._id)
            if (!hasNasional) {
              newCategories.push({ _type: 'reference', _ref: nasional._id })
            }

            await writeClient
              .patch(article._id)
              .set({ categories: newCategories })
              .commit()
              .catch((err: any) => {
                logs.push(`⚠️ Gagal update ${article._id}: ${err.message}`)
              })
          }

          // Update draft versions
          for (const draft of drafts) {
            const draftId = draft.draftId
            if (!draftId) continue
            
            const newCategories = (draft.categories || [])
              .filter((c: any) => c._ref !== kesehatan._id)
              .map((c: any) => ({ _type: 'reference', _ref: c._ref }))
            
            const hasNasional = newCategories.some((c: any) => c._ref === nasional._id)
            if (!hasNasional) {
              newCategories.push({ _type: 'reference', _ref: nasional._id })
            }

            await writeClient
              .patch(draftId)
              .set({ categories: newCategories })
              .commit()
              .catch(() => {
                // Draft mungkin tidak ada, skip
              })
          }

          logs.push(`✅ ${articlesCount} artikel dipindahkan ke "Nasional"`)
        }
      }

      // Hapus kategori kesehatan (gunakan delete dengan purge)
      await writeClient.delete(kesehatan._id)
      logs.push('✅ Kategori "Kesehatan" dihapus')
    } else {
      logs.push('ℹ️ Kategori "Kesehatan" tidak ditemukan')
    }

    // 3. Buat kategori "Bisnis" jika belum ada
    const existingBisnis = await client.fetch(
      `count(*[_type == "category" && slug.current == "bisnis"])`
    )
    if (existingBisnis === 0) {
      await writeClient.create({
        _type: 'category',
        title: 'Bisnis',
        slug: { _type: 'slug', current: 'bisnis' },
        description: 'Berita bisnis, ekonomi, dan finansial',
      })
      logs.push('✅ Kategori "Bisnis" dibuat baru')
    } else {
      logs.push('ℹ️ Kategori "Bisnis" sudah ada')
    }

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    logs.push(`❌ Error: ${error.message}`)
    return NextResponse.json({ success: false, logs }, { status: 500 })
  }
}
