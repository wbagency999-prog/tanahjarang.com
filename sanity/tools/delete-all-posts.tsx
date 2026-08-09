// ═══════════════════════════════════════════════════════════
//  Delete All Posts Tool — Sanity Studio
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react'
import { useClient } from 'sanity'
import { Card, Button, Text, Flex, Box, Spinner, useToast } from '@sanity/ui'

export function DeleteAllPostsTool() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [count, setCount] = useState(0)
  const [deleted, setDeleted] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const client = useClient({ apiVersion: '2024-01-01' })
  const toast = useToast()

  const handleCount = async () => {
    const result = await client.fetch<number>('count(*[_type == "post"])')
    setCount(result)
    toast.push({ title: `Ditemukan ${result} artikel` })
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus SEMUA ${count} artikel? Tindakan ini tidak bisa dibatalkan!`)) {
      return
    }

    setIsDeleting(true)
    setDeleted(0)
    setLogs(['Memulai hapus...'])

    try {
      const posts = await client.fetch<{ _id: string }[]>('*[_type == "post"]{_id}')
      setLogs(prev => [...prev, `Ditemukan ${posts.length} artikel`])

      let success = 0
      let failed = 0

      for (const post of posts) {
        try {
          await client.delete(post._id)
          success++
          setDeleted(success)
        } catch (error: any) {
          failed++
          setLogs(prev => [...prev, `Gagal: ${post._id.substring(0, 20)}...`])
        }
      }

      setLogs(prev => [...prev, `Selesai! Berhasil: ${success}, Gagal: ${failed}`])
      toast.push({ title: `Berhasil hapus ${success} artikel`, status: 'success' })
    } catch (error: any) {
      setLogs(prev => [...prev, `Error: ${error.message}`])
      toast.push({ title: 'Gagal hapus artikel', status: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Flex direction="column" gap={4}>
        <Text size={3} weight="bold">
          Hapus Semua Artikel
        </Text>

        <Text size={1} muted>
          Tool ini akan menghapus SEMUA artikel (post) di Sanity.
          Gunakan dengan hati-hati!
        </Text>

        <Flex gap={3}>
          <Button
            text="Hitung Artikel"
            onClick={handleCount}
            disabled={isDeleting}
            mode="ghost"
          />
          <Button
            text={isDeleting ? `Menghapus... (${deleted}/${count})` : `Hapus Semua (${count})`}
            onClick={handleDelete}
            disabled={isDeleting || count === 0}
            tone="critical"
          />
        </Flex>

        {isDeleting && (
          <Flex align="center" gap={2}>
            <Spinner />
            <Text size={1}>Menghapus artikel... {deleted}/{count}</Text>
          </Flex>
        )}

        {logs.length > 0 && (
          <Box
            style={{
              background: '#1a1a1a',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </Box>
        )}
      </Flex>
    </Card>
  )
}
