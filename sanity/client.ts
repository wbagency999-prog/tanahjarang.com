import { createClient, type SanityClient } from '@sanity/client'

let _client: SanityClient | null = null

export function getClient(): SanityClient {
  if (!_client) {
    _client = createClient({
      projectId: '7kf72dsd',
      dataset: 'production',
      apiVersion: '2024-01-01',
      useCdn: false,
      timeout: 10000,
    })
  }
  return _client
}

// Backward compatible export
export const client = getClient()
