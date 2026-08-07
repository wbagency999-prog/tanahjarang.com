"use client";

import { useState, useEffect, useCallback } from "react";

interface Comment {
  _id: string;
  name: string;
  comment: string;
  createdAt: string;
}

interface CommentsProps {
  postId: string;
}

export default function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", comment: "" });

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Gagal memuat komentar:", err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, ...form }),
      });

      if (res.ok) {
        setForm({ name: "", email: "", comment: "" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Gagal mengirim komentar:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 border-t border-[#1A1815]/10 pt-6">
      <h3 className="mb-4 text-lg font-bold">💬 Komentar ({comments.length})</h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-black/10 bg-[#1A1815]/[.02] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Nama *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-black/10 px-3 py-2 text-sm focus:border-[#CC181F] focus:outline-none"
          />
          <input
            type="email"
            placeholder="Email (opsional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-black/10 px-3 py-2 text-sm focus:border-[#CC181F] focus:outline-none"
          />
        </div>
        <textarea
          placeholder="Tulis komentar Anda... *"
          required
          rows={3}
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-[#CC181F] focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-[#CC181F] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Mengirim..." : "Kirim Komentar"}
          </button>
          {success && (
            <p className="text-sm text-green-600">✓ Komentar berhasil dikirim! Menunggu moderasi.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-[#1A1815]/40">* Komentar akan muncul setelah melalui moderasi.</p>
      </form>

      {/* Comments List */}
      {loading ? (
        <p className="text-sm text-[#1A1815]/50">Memuat komentar...</p>
      ) : comments.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#1A1815]/40">Belum ada komentar. Jadilah yang pertama berkomentar!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c) => (
            <div key={c._id} className="rounded-lg border border-black/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CC181F]/10 text-xs font-bold text-[#CC181F]">
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-[#1A1815]/40">
                    {new Date(c.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-[#1A1815]/80 whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
