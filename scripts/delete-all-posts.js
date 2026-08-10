// scripts/delete-all-posts.js
// Jalankan: node scripts/delete-all-posts.js

import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config()

const client = createClient({
  projectId: '7kf72dsd',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

async function deleteAllPosts() {
  console.log('Menghitung artikel...')
  const count = await client.fetch('count(*[_type == "post"])')
  console.log(`Ditemukan ${count} artikel`)

  if (count === 0) {
    console.log('Tidak ada artikel untuk dihapus')
    return
  }

  const answer = await prompt(`Hapus SEMUA ${count} artikel? (ketik YA untuk konfirmasi): `)
  if (answer !== 'YA') {
    console.log('Dibatalkan')
    return
  }

  console.log('Menghapus artikel...')
  const posts = await client.fetch('*[_type == "post"]{_id}')

  let success = 0
  let failed = 0

  for (const post of posts) {
    try {
      await client.delete(post._id)
      success++
      process.stdout.write(`\rMenghapus: ${success}/${count}`)
    } catch (error) {
      failed++
    }
  }

  console.log(`\n\nSelesai! Berhasil: ${success}, Gagal: ${failed}`)
}

// Node.js 18+ doesn't have prompt by default, use readline
import * as readline from 'readline'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve))

deleteAllPosts()
  .catch(console.error)
  .finally(() => rl.close())
