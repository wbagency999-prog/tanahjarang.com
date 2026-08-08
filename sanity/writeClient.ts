import { createClient } from '@sanity/client'

export const writeClient = createClient({
  projectId: '7kf72dsd',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN || '',
  useCdn: false,
})
