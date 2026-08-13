import { getWriteClient } from '@/sanity/writeClient';

// Lock tunggal dipakai bersama oleh fetch / batch-rewrite / publish agar
// hanya satu pipeline yang berjalan pada satu waktu.
const LOCK_ID = 'pipelineRun-active';
const STALE_MS = 25 * 60 * 1000; // di atas maxDuration (300s) + margin

export interface PipelineLock {
  release: () => Promise<void>;
}

// Akuisisi atomik-ish: baca lock, jika ada yg fresh tolak; jika stale hapus.
// Akuisisi lewat createIfNotExists (tidak menimpa) + cek token pemilik.
export async function acquirePipelineLock(): Promise<PipelineLock | null> {
  const writeClient = getWriteClient();
  const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const now = new Date().toISOString();

  const existing = await writeClient.fetch<{ _id: string; status: string; startedAt: string } | null>(
    `*[_id == $id][0]{ _id, status, startedAt }`,
    { id: LOCK_ID }
  );

  if (existing && existing.status === 'running') {
    const age = Date.now() - new Date(existing.startedAt).getTime();
    if (age < STALE_MS) {
      return null; // dipegang proses lain yang masih fresh
    }
    try { await writeClient.delete(existing._id); } catch { /* ignore */ }
  }

  let doc: { token?: string } | undefined;
  try {
    doc = await writeClient.createIfNotExists({
      _id: LOCK_ID,
      _type: 'pipelineRun',
      status: 'running',
      startedAt: now,
      token,
    });
  } catch {
    return null;
  }

  // Bisa jadi proses lain membuat lock di antara baca & buat → bukan milik kita.
  if (doc && doc.token !== token) return null;

  return {
    release: async () => {
      try {
        const current = await writeClient.fetch<{ token?: string } | null>(
          `*[_id == $id][0]{ token }`,
          { id: LOCK_ID }
        );
        if (current && current.token === token) {
          await writeClient.delete(LOCK_ID);
        }
      } catch { /* best effort */ }
    },
  };
}
