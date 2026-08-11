// ═══════════════════════════════════════════════════════════
//  CLEANUP OLD DRAFTS — Hapus artikel lama dari RSS feed
// ═══════════════════════════════════════════════════════════
//  Jalankan: npx tsx scripts/cleanup-old-drafts.ts

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '7kf72dsd',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

async function main() {
  console.log('Fetching all posts...');

  // Ambil semua post (termasuk yang tanpa pipelineStatus — artikel lama)
  const allPosts = await client.fetch<{ _id: string; title: string; sourceName?: string; pipelineStatus?: string }[]>(
    `*[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      sourceName,
      pipelineStatus
    }`
  );

  console.log(`Found ${allPosts.length} total posts`);

  // Filter: hapus yang dari CNN/CNBC atau tanpa sourceName (artikel lama)
  const toDelete = allPosts.filter((post) => {
    const sn = (post.sourceName || '').toLowerCase();
    const isOldSource = sn.includes('cnn') || sn.includes('cnbc');
    const noSource = !post.sourceName;
    return isOldSource || noSource;
  });

  console.log(`Posts to delete: ${toDelete.length}`);
  toDelete.forEach((p) => console.log(`  - [${p.pipelineStatus}] ${p.sourceName || '(no source)'}: ${p.title.substring(0, 60)}`));

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  // Hapus berurutan
  let deleted = 0;
  for (const post of toDelete) {
    try {
      await client.delete(post._id);
      deleted++;
      if (deleted % 10 === 0) console.log(`  Deleted ${deleted}/${toDelete.length}...`);
    } catch (err: any) {
      console.error(`  Failed to delete ${post._id}: ${err.message}`);
    }
  }

  console.log(`\nDone! Deleted ${deleted}/${toDelete.length} posts.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
