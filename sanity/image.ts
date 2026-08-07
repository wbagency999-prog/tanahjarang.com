import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from './client'

const builder = createImageUrlBuilder(client)

/**
 * Build Sanity image URL dengan format WebP untuk performa.
 * WebP 25-35% lebih kecil dari JPEG, meningkatkan LCP & FID.
 * Browser lama otomatis fallback ke JPEG via Sanity CDN.
 */
export function urlFor(source: any) {
  return builder.image(source).auto('format')
}
