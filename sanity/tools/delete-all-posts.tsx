// ═══════════════════════════════════════════════════════════
//  Delete Posts Tool — Sanity Studio (Select & Batch Delete)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react'
import { useClient } from 'sanity'
import {
  Card,
  Button,
  Text,
  Flex,
  Box,
  Spinner,
  useToast,
  Checkbox,
  TextInput,
} from '@sanity/ui'

interface Post {
  _id: string
  _type: string
  title: string
  slug?: string
  publishedAt?: string
  _updatedAt?: string
}

export function DeleteAllPostsTool() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const client = useClient({ apiVersion: '2024-01-01' })
  const toast = useToast()

  // Fetch all posts
  const handleFetch = async () => {
    setIsLoading(true)
    setLogs([])
    try {
      const result = await client.fetch<Post[]>(
        `*[_type in ["post", "article", "page"] && defined(title)] | order(publishedAt desc) {
          _id,
          _type,
          "title": title,
          "slug": slug.current,
          publishedAt,
          _updatedAt
        }`
      )
      setPosts(result)
      setLogs([`Ditemukan ${result.length} artikel`])
      toast.push({ title: `Ditemukan ${result.length} artikel` })
    } catch (error: any) {
      setLogs([`Error fetch: ${error.message}`])
      toast.push({ title: 'Gagal fetch artikel', status: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  // Select all / deselect all
  const handleSelectAll = () => {
    const filtered = getFilteredPosts()
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((p) => p._id)))
    }
  }

  // Toggle single post
  const handleToggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelected(next)
  }

  // Batch delete selected
  const handleDelete = async () => {
    if (selected.size === 0) {
      toast.push({ title: 'Pilih artikel terlebih dahulu', status: 'warning' })
      return
    }

    if (
      !confirm(
        `Hapus ${selected.size} artikel yang dipilih? Tindakan ini tidak bisa dibatalkan!`
      )
    ) {
      return
    }

    setIsDeleting(true)
    setDeletedCount(0)
    setLogs([`Menghapus ${selected.size} artikel...`])

    let success = 0
    let failed = 0

    for (const id of selected) {
      try {
        await client.delete(id)
        success++
        setDeletedCount(success)
        setLogs((prev) => [...prev, `✓ ${id.substring(0, 30)}...`])
      } catch (error: any) {
        failed++
        setLogs((prev) => [...prev, `✗ ${id.substring(0, 30)}... - ${error.message}`])
      }
    }

    setLogs((prev) => [
      ...prev,
      `Selesai! Berhasil: ${success}, Gagal: ${failed}`,
    ])
    toast.push({ title: `Berhasil hapus ${success} artikel`, status: 'success' })

    // Refresh list
    setSelected(new Set())
    setIsDeleting(false)
    handleFetch()
  }

  // Delete single post
  const handleDeleteSingle = async (id: string, title: string) => {
    if (!confirm(`Hapus "${title}"?`)) return

    try {
      await client.delete(id)
      toast.push({ title: `Berhasil hapus "${title}"`, status: 'success' })
      handleFetch()
    } catch (error: any) {
      toast.push({ title: `Gagal hapus: ${error.message}`, status: 'error' })
    }
  }

  // Filter by search
  const getFilteredPosts = () => {
    if (!search) return posts
    const q = search.toLowerCase()
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
    )
  }

  const filteredPosts = getFilteredPosts()
  const allSelected = filteredPosts.length > 0 && selected.size === filteredPosts.length

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Flex direction="column" gap={4}>
        {/* Header */}
        <Text size={3} weight="bold">
          Kelola & Hapus Artikel
        </Text>
        <Text size={1} muted>
          Fetch, pilih, dan batch hapus artikel dari Sanity.
        </Text>

        {/* Action Buttons */}
        <Flex gap={3} wrap="wrap">
          <Button
            text={isLoading ? 'Memuat...' : 'Fetch Artikel'}
            onClick={handleFetch}
            disabled={isLoading}
            loading={isLoading}
            mode="ghost"
          />
          {posts.length > 0 && (
            <>
              <Button
                text={allSelected ? 'Deselect All' : 'Select All'}
                onClick={handleSelectAll}
                disabled={isDeleting}
                mode="ghost"
              />
              <Button
                text={
                  isDeleting
                    ? `Menghapus... (${deletedCount}/${selected.size})`
                    : `Hapus Terpilih (${selected.size})`
                }
                onClick={handleDelete}
                disabled={isDeleting || selected.size === 0}
                tone="critical"
              />
            </>
          )}
        </Flex>

        {/* Search */}
        {posts.length > 0 && (
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Cari judul atau slug..."
            disabled={isDeleting}
          />
        )}

        {/* Loading */}
        {isDeleting && (
          <Flex align="center" gap={2}>
            <Spinner />
            <Text size={1}>
              Menghapus... {deletedCount}/{selected.size}
            </Text>
          </Flex>
        )}

        {/* Post List */}
        {filteredPosts.length > 0 && (
          <Box
            style={{
              background: '#1a1a1a',
              borderRadius: '6px',
              maxHeight: '400px',
              overflow: 'auto',
            }}
          >
            {/* Select All Header */}
            <Flex
              align="center"
              gap={3}
              padding={3}
              style={{
                borderBottom: '1px solid #333',
                position: 'sticky',
                top: 0,
                background: '#1a1a1a',
                zIndex: 1,
              }}
            >
              <Checkbox
                checked={allSelected}
                onChange={handleSelectAll}
                disabled={isDeleting}
              />
              <Text size={1} muted>
                {selected.size} / {filteredPosts.length} dipilih
              </Text>
            </Flex>

            {/* Post Items */}
            {filteredPosts.map((post) => (
              <Flex
                key={post._id}
                align="center"
                gap={3}
                padding={3}
                style={{
                  borderBottom: '1px solid #222',
                  opacity: isDeleting && !selected.has(post._id) ? 0.3 : 1,
                }}
              >
                <Checkbox
                  checked={selected.has(post._id)}
                  onChange={() => handleToggle(post._id)}
                  disabled={isDeleting}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size={1} style={{ wordBreak: 'break-word' }}>
                    {post.title}
                  </Text>
                  <Flex gap={2} style={{ marginTop: '2px' }}>
                    <Text size={0} muted>
                      {post._type}
                    </Text>
                    {post.publishedAt && (
                      <Text size={0} muted>
                        • {new Date(post.publishedAt).toLocaleDateString('id-ID')}
                      </Text>
                    )}
                    {post.slug && (
                      <Text size={0} muted>
                        • /{post.slug}
                      </Text>
                    )}
                  </Flex>
                </Box>
                <Button
                  text="Hapus"
                  onClick={() => handleDeleteSingle(post._id, post.title)}
                  disabled={isDeleting}
                  tone="critical"
                  mode="bleed"
                  fontSize={0}
                  padding={1}
                />
              </Flex>
            ))}
          </Box>
        )}

        {/* Empty state */}
        {!isLoading && posts.length === 0 && !search && (
          <Text size={1} muted style={{ textAlign: 'center', padding: '20px' }}>
            Klik "Fetch Artikel" untuk memuat daftar artikel
          </Text>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <Box
            style={{
              background: '#111',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '150px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '11px',
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
