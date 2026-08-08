import { client } from '@/sanity/client'
import { PUBLISHED_ARTICLES } from '@/app/lib/queries'
import Link from 'next/link'
import { urlFor } from '@/sanity/image'
import { Metadata } from 'next'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Berita AI | Warta Nusantara',
  description: 'Artikel yang disusun oleh AI dari beberapa sumber berita, diverifikasi oleh editor manusia.',
}

interface Article {
  _id: string
  title: string
  slug: { current: string }
  subtitle: string
  leadParagraph: string
  mainImage: any
  categories: string[]
  factCheckScore: number
  publishedAt: string
  sourceAttributions: { sourceName: string; sourceUrl: string }[]
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70 ? 'bg-green-100 text-green-700' :
    score >= 50 ? 'bg-orange-100 text-orange-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}: {score.toFixed(0)}
    </span>
  )
}

export default async function BeritaListPage() {
  const articles = await client.fetch<Article[]>(PUBLISHED_ARTICLES)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-end gap-3 mb-2">
          <div className="h-8 w-1 rounded-full bg-[#DC2626]" />
          <h1 className="text-3xl font-black tracking-tight text-[#1A1815]">
            Berita AI
          </h1>
        </div>
        <p className="ml-5 text-sm text-gray-500">
          Artikel yang disusun oleh AI dari beberapa sumber berita, diverifikasi oleh editor manusia.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-gray-400">Belum ada artikel AI yang dipublikasikan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link
              key={article._id}
              href={`/berita/${article.slug.current}`}
              className="group block rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                {article.mainImage ? (
                  <img
                    src={urlFor(article.mainImage).width(600).height(375).url()}
                    alt={article.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-4xl">📰</span>
                  </div>
                )}
                {/* Score overlay */}
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className="rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    ✓ {article.factCheckScore?.toFixed(0) || '—'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Categories */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {article.categories?.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                <h2 className="text-base font-bold leading-snug text-[#1A1815] group-hover:text-blue-600 transition-colors line-clamp-2">
                  {article.title}
                </h2>
                <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
                  {article.subtitle || article.leadParagraph}
                </p>

                {/* Meta */}
                <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400">
                  <span>📅 {formatDate(article.publishedAt)}</span>
                  <span>📎 {article.sourceAttributions?.length || 0} sumber</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Back */}
      <div className="mt-10 text-center">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Kembali ke beranda
        </Link>
      </div>
    </main>
  )
}
