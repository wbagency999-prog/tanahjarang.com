'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PipelineStats {
  totalPosts: number
  aiRewrittenPosts: number
  humanPosts: number
}

interface RecentPost {
  title: string
  publishedAt: string
  sourceName: string
  seoScore: number
  qaScore: number
  aiRewritten: boolean
}

interface LogEntry {
  type: string
  message: string
  time: string
}

interface PipelineResult {
  published: number
  skipped: number
  processed: number
  total: number
  duration: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState('indonesia')
  const [maxArticles, setMaxArticles] = useState(2)
  const [secret, setSecret] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const addLog = useCallback((type: string, message: string) => {
    setLogs((prev) => [...prev, { type, message, time: new Date().toLocaleTimeString('id-ID') }])
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/auto-publish')
      const data = await res.json()
      setStats(data.stats)
      setRecentPosts(data.recentPosts || [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Timer
  useEffect(() => {
    if (isRunning) {
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  const runPipeline = async () => {
    setIsRunning(true)
    setLogs([])
    setResult(null)
    addLog('info', 'Pipeline dimulai...')

    try {
      const eventSource = new EventSource(
        `/api/auto-publish/stream?secret=${encodeURIComponent(secret)}&mode=${mode}&maxArticles=${maxArticles}`
      )

      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data)
        addLog('info', data.message)
      })

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data)
        addLog('status', data.message)
      })

      eventSource.addEventListener('skip', (e) => {
        const data = JSON.parse(e.data)
        addLog('skip', `Skip: "${data.title}..." (${data.reason})`)
      })

      eventSource.addEventListener('process', (e) => {
        const data = JSON.parse(e.data)
        addLog('process', `[${data.published + 1}/${data.total}] Memproses: "${data.title}..." dari ${data.source}`)
      })

      eventSource.addEventListener('pipeline', (e) => {
        const data = JSON.parse(e.data)
        addLog('pipeline', data.message)
      })

      eventSource.addEventListener('pipeline-log', (e) => {
        const data = JSON.parse(e.data)
        addLog('pipeline-detail', data.message)
      })

      eventSource.addEventListener('published', (e) => {
        const data = JSON.parse(e.data)
        addLog('success', `Published [${data.published}/${data.total}]: "${data.title}..." | QA: ${data.qa} | SEO: ${data.seo}`)
      })

      eventSource.addEventListener('skipped', (e) => {
        const data = JSON.parse(e.data)
        addLog('warn', `Skipped: "${data.title}..." (${data.reason})`)
      })

      eventSource.addEventListener('done', (e) => {
        const data = JSON.parse(e.data)
        setResult(data)
        addLog('done', `Selesai! ${data.published} publish, ${data.skipped} skip | Durasi: ${data.duration}`)
        setIsRunning(false)
        eventSource.close()
        fetchStats()
      })

      eventSource.addEventListener('error', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          addLog('error', `Error: ${data.message}`)
        } catch {
          addLog('error', 'Koneksi terputus')
        }
        setIsRunning(false)
        eventSource.close()
      })

      eventSource.onerror = () => {
        if (isRunning) {
          addLog('error', 'Koneksi SSE terputus')
          setIsRunning(false)
          eventSource.close()
        }
      }
    } catch (error: any) {
      addLog('error', `Error: ${error.message}`)
      setIsRunning(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const progress = result
    ? 100
    : isRunning
      ? Math.min(90, (elapsed / 120) * 100)
      : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1815]">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Pipeline Otomasi Berita AI — Warta Nusantara</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Artikel" value={stats?.totalPosts ?? '...'} color="bg-blue-50 text-blue-700" />
        <StatCard label="Ditulis Ulang AI" value={stats?.aiRewrittenPosts ?? '...'} color="bg-green-50 text-green-700" />
        <StatCard label="Manual / Human" value={stats?.humanPosts ?? '...'} color="bg-purple-50 text-purple-700" />
      </div>

      {/* Pipeline Controls */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[#1A1815]">Jalankan Pipeline</h2>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sumber</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={isRunning}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#CC181F] focus:ring-1 focus:ring-[#CC181F]"
            >
              <option value="indonesia">Indonesia</option>
              <option value="international">Internasional</option>
              <option value="all">Semua</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max Artikel</label>
            <input
              type="number"
              value={maxArticles}
              onChange={(e) => setMaxArticles(Number(e.target.value))}
              min={1}
              max={10}
              disabled={isRunning}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#CC181F] focus:ring-1 focus:ring-[#CC181F]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pipeline Secret</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Masukkan secret key..."
              disabled={isRunning}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#CC181F] focus:ring-1 focus:ring-[#CC181F]"
            />
          </div>
        </div>

        <button
          onClick={runPipeline}
          disabled={isRunning}
          className="rounded-lg bg-[#CC181F] px-6 py-3 font-semibold text-white transition-all hover:bg-[#a51419] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? `Berjalan... ${formatTime(elapsed)}` : 'Jalankan Pipeline'}
        </button>
      </div>

      {/* Progress & Logs */}
      {(isRunning || logs.length > 0) && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#1A1815]">Progress</h2>
            {isRunning && (
              <span className="text-sm text-gray-500">{formatTime(elapsed)}</span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#CC181F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Logs */}
          <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-2 py-0.5 ${getLogColor(log.type)}`}>
                <span className="shrink-0 text-gray-400">{log.time}</span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Summary */}
          {result && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Published" value={result.published} color="text-green-600" />
              <MiniStat label="Skipped" value={result.skipped} color="text-yellow-600" />
              <MiniStat label="Processed" value={result.processed} color="text-blue-600" />
              <MiniStat label="Duration" value={result.duration} color="text-gray-600" />
            </div>
          )}
        </div>
      )}

      {/* Recent Posts */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[#1A1815]">Artikel Terbaru</h2>
        {recentPosts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 font-semibold text-gray-600">Judul</th>
                  <th className="pb-3 font-semibold text-gray-600">Sumber</th>
                  <th className="pb-3 font-semibold text-gray-600">QA</th>
                  <th className="pb-3 font-semibold text-gray-600">SEO</th>
                  <th className="pb-3 font-semibold text-gray-600">AI</th>
                  <th className="pb-3 font-semibold text-gray-600">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium text-[#1A1815]">{post.title?.substring(0, 60)}...</td>
                    <td className="py-3 pr-4 text-gray-600">{post.sourceName || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        (post.qaScore || 0) >= 85 ? 'bg-green-100 text-green-700'
                        : (post.qaScore || 0) >= 70 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                      }`}>{post.qaScore || 0}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        (post.seoScore || 0) >= 70 ? 'bg-green-100 text-green-700'
                        : (post.seoScore || 0) >= 40 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                      }`}>{post.seoScore || 0}</span>
                    </td>
                    <td className="py-3 pr-4">{post.aiRewritten ? 'AI' : 'Manual'}</td>
                    <td className="py-3 text-gray-500">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-gray-400">Belum ada artikel.</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function getLogColor(type: string): string {
  switch (type) {
    case 'success': return 'text-green-600'
    case 'error': return 'text-red-600'
    case 'warn': return 'text-yellow-600'
    case 'skip': return 'text-gray-400'
    case 'pipeline-detail': return 'text-gray-500 pl-4'
    case 'done': return 'text-blue-600 font-bold'
    default: return 'text-gray-700'
  }
}
