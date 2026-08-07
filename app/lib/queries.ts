import { groq } from 'next-sanity'

export const PUBLISHED_ARTICLES = groq`
  *[_type == "aiArticle" && status == "published"] | order(publishedAt desc) [0...20] {
    _id,
    title,
    slug,
    subtitle,
    leadParagraph,
    mainImage,
    categories,
    factCheckScore,
    publishedAt,
    sourceAttributions
  }
`

export const ARTICLE_BY_SLUG = groq`
  *[_type == "aiArticle" && status == "published" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    subtitle,
    leadParagraph,
    body,
    conclusion,
    mainImage,
    categories,
    tags,
    factCheckScore,
    ethicsScore,
    originalityScore,
    sourceAttributions,
    publishedAt,
    aiDisclosure
  }
`

export const ARTICLES_BY_CATEGORY = groq`
  *[_type == "aiArticle" && status == "published" && $category in categories] | order(publishedAt desc) [0...20] {
    _id,
    title,
    slug,
    subtitle,
    mainImage,
    publishedAt,
    sourceAttributions
  }
`
