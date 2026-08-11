import { createClient, type SanityClient } from '@sanity/client'

let _client: SanityClient | null = null

export function getWriteClient(): SanityClient {
  if (!_client) {
    const token = process.env.SANITY_API_WRITE_TOKEN
    if (!token) {
      throw new Error('SANITY_API_WRITE_TOKEN environment variable is required for write operations')
    }
    _client = createClient({
      projectId: '7kf72dsd',
      dataset: 'production',
      apiVersion: '2024-01-01',
      token,
      useCdn: false,
      timeout: 15000,
    })
  }
  return _client
}

// Getter-based export: resolves client at call-time (avoids build-time crash)
export const writeClient: SanityClient = new Proxy({} as SanityClient, {
  get(_, prop) {
    const client = getWriteClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
