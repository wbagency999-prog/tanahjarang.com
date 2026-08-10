import { createClient } from '@sanity/client'

const token = process.env.SANITY_API_WRITE_TOKEN
if (!token) {
  throw new Error('SANITY_API_WRITE_TOKEN environment variable is required for write operations')
}

export const writeClient = createClient({
  projectId: '7kf72dsd',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})
