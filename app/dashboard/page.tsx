'use client'

import { useState, useEffect } from 'react'

interface PendingArticle {
  _id: string
  title: string
  subtitle: string
  leadParagraph: string
  factCheckScore: number
  ethicsScore: number
  originalityScore: number
  sourceAttributions: { sourceName: string; sourceUrl: string }[]
  createdAt: string
}

export default function DashboardPage() {
  const [articles, setArticles] = useState<PendingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<PendingArticle | null>(null)
  const [notes, setNotes] = useState('')
  const pipelineUrl = process.env.NEXT_PUBLIC_PIPELINE_URL || 'http://localhost:8080'

  useEffect(() => {
    fetchPendingArticles()
  }, [])

  async function fetchPendingArticles() {
    setLoading(true)
    try {
      const res = await fetch(`${pipelineUrl}/pending-articles`)
      const data = await res.json()
      setArticles(data.articles)
    } catch (err) {
      console.error('Failed to fetch articles:', err)
    }
    setLoading(false)
  }

  async function reviewArticle(docId: string, action: 'published' | 'rejected') {
    try {
      await fetch(`${pipelineUrl}/articles/${docId}/review?action=${action}&notes=${encodeURIComponent(notes)}`, {
        method: 'POST',
      })
      setArticles((prev) => prev.filter((a) => a._id !== docId))
      setSelectedArticle(null)
      setNotes('')
    } catch (err) {
      console.error('Review failed:', err)
    }
  }

  async function triggerPipeline() {
    try {
      await fetch(`${pipelineUrl}/run-cycle`, { method: 'POST' })
      fetchPendingArticles()
    } catch (err) {
      console.error('Pipeline trigger failed:', err)
    }
  }

  function getScoreColor(score: number, threshold: number = 70) {
    if (score >= threshold) return '#4caf50'
    if (score >= threshold - 20) return '#ff9800'
    return '#e53935'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">📋 Editor Dashboard</h1>
          <p className="text-gray-500">Review artikel AI sebelum dipublikasikan</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchPendingArticles}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            🔄 Refresh
          </button>
          <button onClick={triggerPipeline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            ▶ Run Pipeline
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">Loading...</p>
      ) : articles.length === 0 ? (
        <p className="text-center py-12 text-gray-400">
          Tidak ada artikel pending review 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <div key={article._id}
              className="border rounded-xl p-5 hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedArticle(article)}>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {article.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {article.subtitle}
              </p>
              <div className="flex gap-3 text-sm">
                <span className="px-2 py-1 rounded-full text-white text-xs"
                  style={{ backgroundColor: getScoreColor(article.factCheckScore) }}>
                  Fact: {article.factCheckScore?.toFixed(0)}
                </span>
                <span className="px-2 py-1 rounded-full text-white text-xs"
                  style={{ backgroundColor: getScoreColor(article.ethicsScore) }}>
                  Ethics: {article.ethicsScore?.toFixed(0)}
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                  Orig: {((article.originalityScore || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {article.sourceAttributions?.length || 0} sumber |
                {new Date(article.createdAt).toLocaleDateString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Review Detail */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedArticle(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 m-4"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">{selectedArticle.title}</h2>
            <p className="text-gray-500 mb-4">{selectedArticle.subtitle}</p>
            <p className="mb-6 leading-relaxed">{selectedArticle.leadParagraph}</p>

            {/* Scores */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold" style={{ color: getScoreColor(selectedArticle.factCheckScore) }}>
                  {selectedArticle.factCheckScore?.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Fact-Check</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold" style={{ color: getScoreColor(selectedArticle.ethicsScore) }}>
                  {selectedArticle.ethicsScore?.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Ethics</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {((selectedArticle.originalityScore || 0) * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Originalitas</div>
              </div>
            </div>

            {/* Sources */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">📎 Sumber Referensi</h3>
              {selectedArticle.sourceAttributions?.map((s, i) => (
                <div key={i} className="text-sm text-blue-600 hover:underline mb-1">
                  <a href={s.sourceUrl} target="_blank" rel="noopener">
                    {s.sourceName}: {s.sourceUrl}
                  </a>
                </div>
              ))}
            </div>

            {/* Editor Notes */}
            <textarea
              className="w-full border rounded-lg p-3 mb-4 text-sm"
              rows={3}
              placeholder="Catatan editor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button onClick={() => reviewArticle(selectedArticle._id, 'rejected')}
                className="px-5 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                ❌ Tolak
              </button>
              <button onClick={() => reviewArticle(selectedArticle._id, 'published')}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                🚀 Publikasikan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
