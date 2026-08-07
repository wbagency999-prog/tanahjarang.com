import { client } from '@/sanity/client'
import { ARTICLE_BY_SLUG, PUBLISHED_ARTICLES } from '@/lib/queries'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

interface Article {
  _id: string
  title: string
  slug: { current: string }
  subtitle: string
  leadParagraph: string
  body: any[]
  conclusion: string
  mainImage: any
  categories: string[]
  tags: string[]
  factCheckScore: number
  ethicsScore: number
  originalityScore: number
  sourceAttributions: { sourceName: string; sourceUrl: string; accessedAt: string }[]
  publishedAt: string
  aiDisclosure: boolean
}

export async function generateStaticParams() {
  const articles = await client.fetch<{ slug: { current: string } }[]>(PUBLISHED_ARTICLES)
  return articles.map((a) => ({ slug: a.slug.current }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await client.fetch<Article>(ARTICLE_BY_SLUG, { slug: params.slug })
  if (!article) return {}
  return {
    title: article.title,
    description: article.leadParagraph,
    openGraph: {
      title: article.title,
      description: article.leadParagraph,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await client.fetch<Article>(ARTICLE_BY_SLUG, { slug: params.slug })
  if (!article) notFound()

  const scoreColor = (score: number) => score >= 70 ? '#16a34a' : score >= 50 ? '#ea580c' : '#dc2626'

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      {/* AI DISCLOSURE BADGE */}
      {article.aiDisclosure && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-amber-800">
            🤖 Artikel ini disusun oleh AI dari beberapa sumber berita, diverifikasi oleh editor manusia.
          </p>
        </div>
      )}

      {/* CATEGORIES */}
      <div className="flex gap-2 mb-4">
        {article.categories?.map((cat) => (
          <span key={cat} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            {cat}
          </span>
        ))}
      </div>

      {/* TITLE */}
      <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
        {article.title}
      </h1>
      <p className="text-xl text-gray-500 mb-6">{article.subtitle}</p>

      {/* META */}
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b">
        <span>📅 {new Date(article.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span>📊 Fact: {article.factCheckScore?.toFixed(0)}/100</span>
        <span>🛡️ Ethics: {article.ethicsScore?.toFixed(0)}/100</span>
      </div>

      {/* LEAD */}
      <p className="text-lg font-medium text-gray-700 mb-6 leading-relaxed border-l-4 border-blue-500 pl-4">
        {article.leadParagraph}
      </p>

      {/* BODY */}
      <div className="prose prose-lg max-w-none mb-8">
        {article.body?.map((block: any, i: number) => (
          <p key={i} className="mb-4 leading-relaxed">
            {block.children?.map((child: any) => child.text).join('')}
          </p>
        ))}
      </div>

      {/* CONCLUSION */}
      {article.conclusion && (
        <div className="bg-gray-50 rounded-xl p-6 mb-8 border">
          <h3 className="font-semibold mb-2">Kesimpulan</h3>
          <p className="text-gray-700 leading-relaxed">{article.conclusion}</p>
        </div>
      )}

      {/* SOURCE REFERENCES — WAJIB */}
      <div className="bg-blue-50 rounded-xl p-6 mt-8">
        <h3 className="font-semibold text-blue-900 mb-3">📎 Sumber Referensi</h3>
        <p className="text-sm text-blue-800 mb-3">
          Artikel ini disusun berdasarkan informasi dari sumber-sumber berikut:
        </p>
        <ol className="list-decimal list-inside space-y-2">
          {article.sourceAttributions?.map((s, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">{s.sourceName}</span> —{' '}
              <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline">
                {s.sourceUrl}
              </a>
              <span className="text-gray-400 ml-2">
                (diakses {new Date(s.accessedAt).toLocaleDateString('id-ID')})
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* BACK */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-blue-600 hover:underline">← Kembali ke beranda</Link>
      </div>
    </article>
  )
}
