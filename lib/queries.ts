import { cache } from 'react';
import { client } from '@/sanity/client';

// Proyeksi kartu post dipakai konsisten di semua daftar (home, kategori, related, search, dll)
export const POST_CARD_PROJECTION = `_id, title, slug, excerpt, mainImage, publishedAt, categories[]{title, slug}, views`;

// getPost dibungkus React cache() agar di-dedupe per-request —
// menghilangkan double-fetch saat dipanggil di generateMetadata & render.
// Generic T disediakan pemanggil agar tipe post tetap terjaga.
export const getPost = cache(
  async <T,>(slug: string): Promise<T | null> => {
    return client.fetch<T | null>(
      `*[_type == "post" && slug.current == $slug][0]{
        _id,
        title,
        subtitle,
        slug,
        excerpt,
        metaDescription,
        seo,
        mainImage,
        publishedAt,
        updatedAt,
        categories[]->{title, slug},
        tags,
        tableOfContent,
        body,
        views,
        originalUrl,
        sourceName,
        imageCaption,
        author->{name, image, bio, slug, verified, role},
        factCheckScore,
        ethicsScore,
        originalityScore,
        plagiarismScore,
        sourceAttributions,
        aiDisclosure,
        verifiedFacts
      }`,
      { slug }
    );
  }
);

export const getCategories = cache(async () => {
  return client.fetch(
    `*[_type == "category" && defined(slug.current) && slug.current != "bisnis-ekonomi"] | order(title asc){ title, slug }`
  );
});

export const getAuthor = cache(
  async <T,>(slug: string): Promise<T | null> => {
    return client.fetch<T | null>(
      `*[_type == "author" && slug.current == $slug][0]{
        _id, name, slug, image, bio, verified,
        role, experience, specializations,
        education, certifications, yearsOfExperience,
        socialLinks, email, correctionPolicy
      }`,
      { slug }
    );
  }
);

// Artikel "popular" bertingkat (all-time) per kategori
export const getPopular = cache(
  async <T,>(excludeId: string, categorySlug?: string): Promise<T[]> => {
    const categoryFilter = categorySlug ? `&& $category in categories[]->slug.current` : '';
    const params: Record<string, string> = { excludeId };
    if (categorySlug) params.category = categorySlug;
    return client.fetch<T[]>(
      `*[_type == "post" && _id != $excludeId ${categoryFilter}] | order(views desc)[0...8]{
        _id, title, slug, mainImage, views, categories[]{title, slug}, publishedAt
      }`,
      params
    );
  }
);
