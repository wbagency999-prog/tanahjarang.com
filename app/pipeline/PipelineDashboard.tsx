// ═══════════════════════════════════════════════════════════
//  PIPELINE DASHBOARD — Editorial review interface
// ═══════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';

interface PipelinePost {
  _id: string;
  title: string;
  excerpt: string;
  pipelineStatus: string;
  publishedAt: string;
  sourceName: string;
  tags: string[];
  aiDisclosure: boolean;
  aiMetadata?: {
    model: string;
    rewrittenAt: string;
    originalTitle: string;
  };
}

type FilterStatus = 'all' | 'pending-review' | 'ready-for-review' | 'approved' | 'published' | 'rejected';

export default function PipelineDashboard() {
  const [secret, setSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<PipelinePost[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('ready-for-review');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pipeline/posts?secret=${secret}&status=${filter}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      setMessage('Gagal mengambil data');
    }
    setLoading(false);
  };

  const updateStatus = async (postId: string, status: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch('/api/pipeline/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, postId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Status berhasil diupdate');
        fetchPosts();
      } else {
        setMessage(data.error || 'Gagal update status');
      }
    } catch (error) {
      setMessage('Gagal update status');
    }
    setActionLoading(null);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) {
      setIsAuthenticated(true);
      fetchPosts();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [filter, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleAuth} className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Pipeline Dashboard</h1>
          <input
            type="password"
            placeholder="Masukkan secret key"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            type="submit"
            className="w-full bg-[#CC181F] text-white py-2 rounded-lg hover:bg-[#A31419]"
          >
            Masuk
          </button>
        </form>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'pending-review': 'bg-yellow-100 text-yellow-800',
    'ready-for-review': 'bg-blue-100 text-blue-800',
    'approved': 'bg-green-100 text-green-800',
    'published': 'bg-purple-100 text-purple-800',
    'rejected': 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    'pending-review': 'Pending Review',
    'ready-for-review': 'Siap Direview',
    'approved': 'Disetujui',
    'published': 'Dipublikasikan',
    'rejected': 'Ditolak',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-[#CC181F]">Pipeline Dashboard</h1>
          <p className="text-sm text-gray-500">Review dan approve artikel sebelum dipublikasikan</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => fetch('/api/pipeline/fetch?secret=' + secret).then(() => fetchPosts())}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Fetch Berita
          </button>
          <button
            onClick={() => fetch('/api/pipeline/rewrite?secret=' + secret).then(() => fetchPosts())}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            AI Rewrite
          </button>
          <button
            onClick={() => fetch('/api/pipeline/publish?secret=' + secret).then(() => fetchPosts())}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Publish Approved
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-blue-100 text-blue-800 p-3 rounded-lg mb-4">
            {message}
            <button onClick={() => setMessage('')} className="ml-2 underline">
              Tutup
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending-review', 'ready-for-review', 'approved', 'published', 'rejected'] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  filter === status ? 'bg-[#CC181F] text-white' : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {status === 'all' ? 'Semua' : statusLabels[status]}
              </button>
            )
          )}
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Tidak ada artikel</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post._id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[post.pipelineStatus]}`}>
                        {statusLabels[post.pipelineStatus]}
                      </span>
                      {post.aiDisclosure && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          AI
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{post.excerpt}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Sumber: {post.sourceName}</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString('id-ID')}</span>
                      {post.tags.length > 0 && (
                        <span>Tags: {post.tags.slice(0, 3).join(', ')}</span>
                      )}
                    </div>
                    {post.aiMetadata && (
                      <div className="text-xs text-gray-400 mt-1">
                        Original: {post.aiMetadata.originalTitle}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {post.pipelineStatus === 'ready-for-review' && (
                      <>
                        <button
                          onClick={() => updateStatus(post._id, 'approved')}
                          disabled={actionLoading === post._id}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === post._id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => updateStatus(post._id, 'rejected')}
                          disabled={actionLoading === post._id}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === post._id ? '...' : 'Reject'}
                        </button>
                      </>
                    )}
                    {post.pipelineStatus === 'pending-review' && (
                      <button
                        onClick={() => updateStatus(post._id, 'ready-for-review')}
                        disabled={actionLoading === post._id}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === post._id ? '...' : 'Rewrite'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
