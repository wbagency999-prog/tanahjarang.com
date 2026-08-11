// ═══════════════════════════════════════════════════════════
//  PIPELINE DASHBOARD — Mobile-first editorial control
// ═══════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';

interface PipelinePost {
  _id: string;
  title: string;
  excerpt: string;
  pipelineStatus: string;
  publishedAt: string;
  sourceName: string;
  tags: string[];
  aiDisclosure: boolean;
  categories?: { title: string }[];
  aiMetadata?: {
    model: string;
    rewrittenAt: string;
    originalTitle: string;
  };
}

type FilterStatus = 'all' | 'pending-review' | 'ready-for-review' | 'approved' | 'published' | 'rejected';

interface PipelineRun {
  id: string;
  type: 'fetch' | 'rewrite' | 'publish';
  status: 'running' | 'done' | 'error';
  startedAt: Date;
  result?: string;
}

export default function PipelineDashboard() {
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<PipelinePost[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending-review');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchPosts = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pipeline/posts?secret=${secret}&status=${filter}`);
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
      // Count all statuses
      const counts: Record<string, number> = {};
      for (const s of ['pending-review', 'ready-for-review', 'approved', 'published', 'rejected']) {
        const r = await fetch(`/api/pipeline/posts?secret=${secret}&status=${s}`);
        const d = await r.json();
        counts[s] = d.posts?.length || 0;
      }
      setStatusCounts(counts);
    } catch {}
    setLoading(false);
  }, [secret, filter]);

  useEffect(() => {
    if (isAuthenticated) fetchPosts();
  }, [filter, isAuthenticated, fetchPosts]);

  const runPipeline = async (type: 'fetch' | 'rewrite' | 'publish') => {
    const runId = `${type}-${Date.now()}`;
    const newRun: PipelineRun = { id: runId, type, status: 'running', startedAt: new Date() };
    setRuns(prev => [newRun, ...prev]);

    try {
      const res = await fetch(`/api/pipeline/${type}?secret=${secret}`);

      // Fetch returns streaming text — read chunks in real-time
      if (type === 'fetch' && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lastLine = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) lastLine = line;
        }

        setRuns(prev => prev.map(r => r.id === runId ? {
          ...r,
          status: 'done',
          result: lastLine || 'Selesai',
        } : r));
      } else {
        // Rewrite & publish return JSON
        const data = await res.json();
        setRuns(prev => prev.map(r => r.id === runId ? {
          ...r,
          status: 'done',
          result: data.success
            ? `${data.totalSaved ?? data.rewritten ?? data.published ?? 0} artikel diproses`
            : (data.error || 'Gagal'),
        } : r));
      }
      fetchPosts();
    } catch {
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'error', result: 'Network error' } : r));
    }
  };

  const updateStatus = async (postId: string, status: string) => {
    setActionLoading(postId);
    try {
      await fetch('/api/pipeline/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, postId, status }),
      });
      fetchPosts();
    } catch {}
    setActionLoading(null);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) {
      setIsAuthenticated(true);
      localStorage.setItem('pipeline-secret', secret);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('pipeline-secret');
    if (saved) { setSecret(saved); setIsAuthenticated(true); }
  }, []);

  const statusColors: Record<string, string> = {
    'pending-review': 'bg-amber-100 text-amber-800 border-amber-200',
    'ready-for-review': 'bg-blue-100 text-blue-800 border-blue-200',
    'approved': 'bg-green-100 text-green-800 border-green-200',
    'published': 'bg-purple-100 text-purple-800 border-purple-200',
    'rejected': 'bg-red-100 text-red-800 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    'pending-review': 'Pending',
    'ready-for-review': 'Review',
    'approved': 'Disetujui',
    'published': 'Published',
    'rejected': 'Ditolak',
  };

  // ─── Login Screen ───
  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleAuth} className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#CC181F] rounded-xl mx-auto mb-3 flex items-center justify-center">
              <span className="text-white text-xl font-bold">W</span>
            </div>
            <h1 className="text-xl font-bold">Pipeline</h1>
            <p className="text-sm text-gray-500">Warta Nusantara</p>
          </div>
          <input
            type="password"
            placeholder="Secret key"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC181F]/30 focus:border-[#CC181F]"
          />
          <button
            type="submit"
            className="w-full bg-[#CC181F] text-white py-3 rounded-xl font-medium active:scale-[0.98] transition-transform"
          >
            Masuk
          </button>
        </form>
      </div>
    );
  }

  // ─── Main Dashboard ───
  return (
    <div className="min-h-dvh bg-gray-50 pb-safe">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#CC181F]">Pipeline</h1>
              <p className="text-xs text-gray-400">Warta Nusantara</p>
            </div>
            <button
              onClick={() => { localStorage.removeItem('pipeline-secret'); setIsAuthenticated(false); setPosts([]); }}
              className="text-xs text-gray-400 px-3 py-1 rounded-lg border border-gray-200"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* ─── Pipeline Controls ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Kontrol Pipeline</h2>
          <div className="grid grid-cols-3 gap-2">
            <PipelineButton
              label="Fetch"
              icon="📰"
              color="blue"
              onClick={() => runPipeline('fetch')}
              runs={runs}
              type="fetch"
            />
            <PipelineButton
              label="Rewrite"
              icon="✍️"
              color="purple"
              onClick={() => runPipeline('rewrite')}
              runs={runs}
              type="rewrite"
            />
            <PipelineButton
              label="Publish"
              icon="🚀"
              color="green"
              onClick={() => runPipeline('publish')}
              runs={runs}
              type="publish"
            />
          </div>

          {/* Recent runs */}
          {runs.length > 0 && (
            <div className="mt-3 space-y-1">
              {runs.slice(0, 3).map(run => (
                <div key={run.id} className="flex items-center gap-2 text-xs">
                  <span className={
                    run.status === 'running' ? 'animate-pulse text-amber-500' :
                    run.status === 'done' ? 'text-green-500' : 'text-red-500'
                  }>
                    {run.status === 'running' ? '●' : run.status === 'done' ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-500">{run.type}</span>
                  <span className="text-gray-700 truncate flex-1">{run.result || 'Berjalan...'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Status Counts ─── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {(['pending-review', 'ready-for-review', 'approved', 'published'] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                filter === status
                  ? 'bg-[#CC181F] text-white border-[#CC181F]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {statusLabels[status]} ({statusCounts[status] || 0})
            </button>
          ))}
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              filter === 'all'
                ? 'bg-[#CC181F] text-white border-[#CC181F]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Semua
          </button>
        </div>

        {/* ─── Articles List ─── */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#CC181F] rounded-full animate-spin mb-2" />
            <p className="text-sm">Memuat artikel...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">Tidak ada artikel</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <ArticleCard
                key={post._id}
                post={post}
                actionLoading={actionLoading}
                onUpdateStatus={updateStatus}
                statusColors={statusColors}
                statusLabels={statusLabels}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Button Component ───
function PipelineButton({ label, icon, color, onClick, runs, type }: {
  label: string; icon: string; color: string; onClick: () => void;
  runs: PipelineRun[]; type: string;
}) {
  const isRunning = runs.some(r => r.type === type && r.status === 'running');
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 active:bg-blue-100',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 active:bg-purple-100',
    green: 'bg-green-50 border-green-200 text-green-700 active:bg-green-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className={`py-3 px-2 rounded-xl border text-center transition-all active:scale-[0.96] disabled:opacity-50 ${colors[color]}`}
    >
      <span className="text-xl block">{isRunning ? '⏳' : icon}</span>
      <span className="text-xs font-medium mt-1 block">{label}</span>
    </button>
  );
}

// ─── Article Card Component ───
function ArticleCard({ post, actionLoading, onUpdateStatus, statusColors, statusLabels }: {
  post: PipelinePost;
  actionLoading: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[post.pipelineStatus]}`}>
                {statusLabels[post.pipelineStatus]}
              </span>
              <span className="text-[10px] text-gray-400">{post.sourceName}</span>
              {post.aiDisclosure && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500">AI</span>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
          </div>
          <span className="text-gray-300 text-sm mt-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Details + Actions */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
          {/* Meta */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Tanggal: {new Date(post.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {post.tags.length > 0 && <p>Tags: {post.tags.join(', ')}</p>}
            {post.aiMetadata && (
              <p className="text-gray-400 italic">Original: {post.aiMetadata.originalTitle}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {post.pipelineStatus === 'pending-review' && (
              <ActionButton
                label="✍️ Rewrite"
                color="blue"
                loading={actionLoading === post._id}
                onClick={() => onUpdateStatus(post._id, 'ready-for-review')}
              />
            )}
            {post.pipelineStatus === 'ready-for-review' && (
              <>
                <ActionButton
                  label="✓ Approve"
                  color="green"
                  loading={actionLoading === post._id}
                  onClick={() => onUpdateStatus(post._id, 'approved')}
                />
                <ActionButton
                  label="✗ Reject"
                  color="red"
                  loading={actionLoading === post._id}
                  onClick={() => onUpdateStatus(post._id, 'rejected')}
                />
              </>
            )}
            {post.pipelineStatus === 'approved' && (
              <ActionButton
                label="🚀 Publish"
                color="purple"
                loading={actionLoading === post._id}
                onClick={() => onUpdateStatus(post._id, 'published')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Action Button Component ───
function ActionButton({ label, color, loading, onClick }: {
  label: string; color: string; loading: boolean; onClick: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={loading}
      className={`px-4 py-2 rounded-xl text-xs font-medium text-white active:scale-[0.96] transition-all disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? '...' : label}
    </button>
  );
}
