import { client } from "@/sanity/client";
import { writeClient } from "@/sanity/writeClient";
import { getPost, getPopular } from "@/lib/queries";
import { urlFor } from "@/sanity/image";
import { PortableText } from "@portabletext/react";
import { notFound } from "next/navigation";
import Image from "next/image";
import ShareButtons from "./ShareButtons";
import ShareMore from "./ShareMore";
import Breadcrumb from "./Breadcrumb";
import Reactions from "./Reactions";
import FontSizeSlider from "./FontSizeSlider";
import AuthorBox from "./AuthorBox";
import FollowOnGoogle from "./FollowOnGoogle";
import ImageLightbox from "./ImageLightbox";
import Comments from "./Comments";
import ArticleSidebar from "./ArticleSidebar";
import AdSlot from "./AdSlot";
import { articleHref } from "../lib/articleHref";
import { waktuLalu } from "../lib/waktuLalu";
import { estimasiBaca } from "../lib/readTime";
import type { Metadata } from "next";

/* ───────── Interfaces ───────── */

interface RelatedPost {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: any;
  categories: { slug?: { current: string }; title?: string }[];
  tags?: string[];
  publishedAt: string;
  views: number;
}

interface PopularPost {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: any;
  views: number;
  categories: { title: string; slug: { current: string } }[];
  publishedAt: string;
}

interface ReactionData {
  like: number;
  dislike: number;
  funny: number;
  angry: number;
}

interface SourceAttribution {
  sourceName: string;
  sourceUrl: string;
  accessedAt: string;
}

interface VerifiedFact {
  claim: string;
  confidence: string;
  supportingSources: string[];
}

interface Post {
  _id: string;
  title: string;
  subtitle?: string;
  slug: { current: string };
  excerpt: string;
  metaDescription?: string;
  seo?: {
    seoTitle?: string;
    seoDescription?: string;
    ogDescription?: string;
    ogImage?: any;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
  mainImage: any;
  publishedAt: string;
  updatedAt?: string;
  categories: { title: string; slug: { current: string } }[];
  tags: string[];
  tableOfContent?: string;
  body: any;
  views: number;
  originalUrl?: string;
  sourceName?: string;
  imageCaption?: string;
  author: { name: string; image?: any; bio?: string; slug?: { current: string }; verified?: boolean; role?: string } | null;
  // AI Pipeline Metrics
  factCheckScore?: number;
  ethicsScore?: number;
  originalityScore?: number;
  plagiarismScore?: number;
  sourceAttributions?: SourceAttribution[];
  aiDisclosure?: boolean;
  verifiedFacts?: VerifiedFact[];
}

/* ───────── Queries ───────── */

async function getReactions(postId: string): Promise<ReactionData> {
  const data = await client.fetch(
    `*[_type == "reaction" && post._ref == $postId][0]{ like, dislike, funny, angry }`,
    { postId }
  );
  return {
    like: data?.like ?? 0,
    dislike: data?.dislike ?? 0,
    funny: data?.funny ?? 0,
    angry: data?.angry ?? 0,
  };
}

async function getRelated(postId: string, categoryTitles: string[], postTags: string[]): Promise<RelatedPost[]> {
  if (categoryTitles.length === 0 && postTags.length === 0) return [];
  return client.fetch(
    `*[_type == "post" && _id != $postId && (count((categories[]->title)[@ in $categoryTitles]) > 0 || count((tags)[@ in $postTags]) > 0)] | order(publishedAt desc)[0...12]{
      _id,
      title,
      slug,
      mainImage,
      categories[]->{slug, title},
      tags,
      publishedAt,
      views
    }`,
    { postId, categoryTitles, postTags }
  );
}

async function incrementViews(id: string) {
  try {
    await writeClient.patch(id).setIfMissing({ views: 0 }).inc({ views: 1 }).commit();
  } catch (err) {
    console.error("Gagal update views:", err);
  }
}

/* ───────── Metadata ───────── */

const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";

export async function getArticleMetadata(slug: string): Promise<Metadata> {
  const post = await getPost<Post>(slug);
  if (!post) return {};

  // Use ogImage if available, fallback to mainImage
  const ogImageUrl = post.seo?.ogImage
    ? urlFor(post.seo.ogImage).width(1200).height(675).url()
    : post.mainImage
      ? urlFor(post.mainImage).width(1200).height(675).url()
      : undefined;

  const categorySlug = post.categories?.[0]?.slug?.current || "nasional";
  const articleUrl = `${baseUrl}/${categorySlug}/${slug}`;
  const canonicalUrl = post.seo?.canonicalUrl || articleUrl;
  const description = post.seo?.seoDescription || post.excerpt || post.metaDescription;
  const ogDescription = post.seo?.ogDescription || post.seo?.seoDescription || post.excerpt || post.metaDescription;

  return {
    title: `${post.title} | Warta Nusantara`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: post.seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: ogDescription,
      type: "article",
      url: canonicalUrl,
      siteName: "Warta Nusantara",
      locale: "id_ID",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: post.author?.name ? [post.author.name] : [],
      images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 675, alt: post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  };
}

/* ───────── PortableText Components ───────── */

// Helper: extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#/]+)/);
  return match?.[1] ?? null;
}

const ptComponents = {
  types: {
    boxDisclaimer: ({ value }: { value: { title?: string; text?: string } }) => (
      <div className="my-6 rounded-md border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800">{value.title || "Disclaimer"}</p>
        <p className="mt-1 text-sm text-amber-900/80">{value.text}</p>
      </div>
    ),
    image: ({ value }: any) => {
      if (!value?.asset) return null;
      const caption = value?.caption || value?.alt;
      return (
        <ImageLightbox
          src={urlFor(value).width(1200).height(675).url()}
          alt={caption || ""}
          width={1200}
          height={675}
          caption={caption}
        />
      );
    },
    horizontalRule: () => (
      <hr className="my-8 border-t border-[#1A1815]/10" />
    ),
    pullQuote: ({ value }: { value: { text?: string; author?: string } }) => (
      <blockquote className="my-6 border-l-4 border-[#CC181F] bg-[#CC181F]/[.04] px-6 py-4">
        <p className="text-lg italic leading-relaxed text-[#1A1815]/80">"{value.text}"</p>
        {value.author && (
          <p className="mt-2 text-sm font-semibold text-[#1A1815]/60">— {value.author}</p>
        )}
      </blockquote>
    ),
    embedVideo: ({ value }: { value: { url?: string; caption?: string } }) => {
      const ytId = extractYouTubeId(value.url || "");
      return (
        <figure className="my-6">
          {ytId ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={value.caption || "Video"}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-red-500">URL video tidak valid: {value.url}</p>
          )}
          {value.caption && (
            <figcaption className="mt-2 text-center text-xs text-[#1A1815]/50 italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    codeBlock: ({ value }: { value: { code?: string; language?: string } }) => (
      <pre className="my-6 overflow-x-auto rounded-lg bg-[#1A1815] p-4">
        <code className="text-sm text-green-400">{value.code}</code>
      </pre>
    ),
    embedTweet: ({ value }: { value: { url?: string } }) => (
      <div className="my-6">
        {value.url ? (
          <blockquote className="twitter-tweet">
            <a href={value.url} target="_blank" rel="noopener noreferrer">{value.url}</a>
          </blockquote>
        ) : (
          <p className="text-sm text-red-500">URL tweet tidak valid</p>
        )}
      </div>
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value?.href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="font-medium text-[#CC181F] hover:underline"
      >
        {children}
      </a>
    ),
  },
  block: {
    normal: ({ children, value }: any) => (
      <p className="mb-4 leading-relaxed">{children}</p>
    ),
    h2: ({ children, value }: any) => (
      <h2 id={value._key} className="mt-8 mb-4 scroll-mt-24 text-2xl font-bold">{children}</h2>
    ),
    h3: ({ children, value }: any) => (
      <h3 id={value._key} className="mt-6 mb-3 scroll-mt-24 text-xl font-bold">{children}</h3>
    ),
    h4: ({ children, value }: any) => (
      <h4 id={value._key} className="mt-4 mb-2 scroll-mt-24 text-lg font-bold">{children}</h4>
    ),
    blockquote: ({ children, value }: any) => (
      <blockquote className="my-6 border-l-4 border-[#CC181F] bg-[#CC181F]/[.04] px-6 py-4 italic">
        {children}
      </blockquote>
    ),
  },
};

/* ───────── Helpers ───────── */

interface Heading {
  id: string;
  text: string;
  level: string;
}

function extractHeadings(body: any): Heading[] {
  if (!Array.isArray(body)) return [];
  return body
    .filter((block) => block._type === "block" && ["h2", "h3", "h4"].includes(block.style))
    .map((block) => ({
      id: block._key,
      text: (block.children ?? []).map((c: any) => c.text ?? "").join(""),
      level: block.style,
    }))
    .filter((h) => h.text.trim().length > 0);
}

// Skor relevansi: categoryMatch * 10 + recency * 5 + views * 3
function scoreRelated(post: RelatedPost, categoryTitles: string[]): number {
  const now = Date.now();
  const postTime = new Date(post.publishedAt).getTime();
  const hoursOld = (now - postTime) / (1000 * 60 * 60);

  const categoryMatch = post.categories?.filter(
    (c) => c.title && categoryTitles.includes(c.title)
  ).length ?? 0;

  const recency = Math.max(0, 1 - hoursOld / (24 * 7)); // decay over 7 days
  const viewScore = Math.min(1, (post.views || 0) / 1000);

  return categoryMatch * 10 + recency * 5 + viewScore * 3;
}

// Cari posisi insert terbaik (antara 40-60%, di akhir kalimat)
function findBestInsertPosition(blocks: any[], preferredRatio: number = 0.5): number {
  if (blocks.length < 4) return Math.floor(blocks.length / 2);

  const min = Math.floor(blocks.length * 0.4);
  const max = Math.floor(blocks.length * 0.6);

  // Cari dari preferredRatio ke bawah, cari kalimat yang berakhir dengan . atau "
  const start = Math.min(Math.floor(blocks.length * preferredRatio), max);
  for (let i = start; i >= min; i--) {
    const block = blocks[i];
    if (block?._type === "block") {
      const text = (block.children ?? []).map((c: any) => c.text ?? "").join("");
      if (text.endsWith(".") || text.endsWith('"') || text.endsWith("!") || text.endsWith("?")) {
        return i + 1; // insert SETELAH paragraf ini
      }
    }
  }

  // Fallback: cari dari bawah ke atas
  for (let i = max; i >= min; i--) {
    if (blocks[i]?._type === "block") return i + 1;
  }

  return Math.floor(blocks.length * preferredRatio);
}

// Tentukan jumlah "Baca Juga" berdasarkan panjang artikel
function getBacaJugaCount(wordCount: number): number {
  if (wordCount < 200) return 0;
  if (wordCount < 400) return 1;
  if (wordCount < 700) return 1;
  if (wordCount < 1000) return 2;
  return 3;
}

/* ───────── Component ───────── */

export default async function ArticleDetail({ slug }: { slug: string }) {
  const post = await getPost<Post>(slug);

  if (!post) {
    notFound();
  }

  try { incrementViews(post._id); } catch { /* fire-and-forget */ }

  const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";
  const categoryTitles = post.categories?.map((c) => c.title) ?? [];
  const mainCatSlug = post.categories?.[0]?.slug?.current || "";

  const [rawRelated, popular, reactions] = await Promise.all([
    getRelated(post._id, categoryTitles, post.tags || []),
    getPopular<PopularPost>(post._id, mainCatSlug || undefined),
    getReactions(post._id),
  ]);

  // Trending 6 jam (top artikel) — per kategori
  const now = new Date();
  const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [trendingRaw, popular24h, popular7d] = await Promise.all([
    // Trending: artikel 6 jam terakhir, sort views, PER KATEGORI (exclude current)
    client.fetch<RelatedPost[]>(
      `*[_type == "post" && _id != $postId && $category in categories[]->slug.current && publishedAt >= $since] | order(views desc)[0...5]{
        _id, title, slug, mainImage, publishedAt, views, categories[]->{slug, title}
      }`,
      { postId: post._id, category: mainCatSlug, since: since6h }
    ),
    // Popular 24 jam, PER KATEGORI
    client.fetch<RelatedPost[]>(
      `*[_type == "post" && _id != $postId && $category in categories[]->slug.current && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, mainImage, publishedAt, views, categories[]->{slug, title}
      }`,
      { postId: post._id, category: mainCatSlug, since: since24h }
    ),
    // Popular 7 hari, PER KATEGORI
    client.fetch<RelatedPost[]>(
      `*[_type == "post" && _id != $postId && $category in categories[]->slug.current && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, mainImage, publishedAt, views, categories[]->{slug, title}
      }`,
      { postId: post._id, category: mainCatSlug, since: since7d }
    ),
  ]);

  // Fallback trending: jika < 2 dari 6 jam, reuse popular24h (hemat 1 GROQ query)
  let trending = trendingRaw;
  if (trending.length < 2) {
    if (popular24h.length > trending.length) trending = popular24h;
  }

  // Score & sort related posts by relevansi
  const scoredRelated = rawRelated
    .map((r) => ({ ...r, score: scoreRelated(r, categoryTitles) }))
    .sort((a, b) => b.score - a.score);

  // Fallback: jika kurang dari 2 artikel sekategori, tambah dari popular
  let related = scoredRelated;
  if (related.length < 2 && popular.length > 0) {
    const popularFallback = popular
      .filter((p) => !related.some((r) => r._id === p._id))
      .slice(0, 2 - related.length)
      .map((p) => ({
        _id: p._id,
        title: p.title,
        slug: p.slug,
        mainImage: p.mainImage,
        categories: p.categories,
        publishedAt: p.publishedAt,
        views: p.views,
        score: 0,
      }));
    related = [...related, ...popularFallback];
  }

  const tanggal = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const jam = new Date(post.publishedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const mainCategory = post.categories?.[0];
  const imageUrl = post.mainImage ? urlFor(post.mainImage).width(1200).height(675).url() : undefined;
  const pageUrl = `${baseUrl}${articleHref(post)}`;
  const headings = post.tableOfContent === "iya" ? extractHeadings(post.body) : [];

  const wordCount = Array.isArray(post.body)
    ? post.body.filter((b: any) => b._type === "block").reduce((sum: number, b: any) => {
        return sum + (b.children ?? []).reduce((s: number, c: any) => s + (c.text?.split(/\s+/).length ?? 0), 0);
      }, 0)
    : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    headline: post.title,
    image: imageUrl ? [imageUrl] : [],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: post.author
      ? { "@type": "Person", name: post.author.name, url: `${baseUrl}/author/${post.author.slug?.current || ""}`, jobTitle: post.author.role || undefined }
      : { "@type": "Person", name: "Redaksi" },
    publisher: {
      "@type": "Organization",
      name: "Warta Nusantara",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon-192.png`,
      },
    },
    description: post.excerpt || post.title,
    articleSection: categoryTitles[0] || undefined,
    keywords: post.tags?.join(", ") || undefined,
    wordCount: wordCount || undefined,
    inLanguage: "id",
    isBasedOn: post.originalUrl || undefined,
    isPartOf: {
      "@type": "WebSite",
      name: "Warta Nusantara",
      url: baseUrl,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".prose"],
    },
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Breadcrumb
            items={[
              { name: "Home", href: "/" },
              ...(mainCategory ? [{ name: mainCategory.title, href: `/${mainCategory.slug.current}` }] : []),
              { name: post.title },
            ]}
          />
        </div>
      </header>

      <AdSlot slotId="article-top" className="mx-auto max-w-6xl px-4 pt-6" />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <article>
            {mainCategory && (
              <span className="w-fit rounded-sm bg-[#CC181F] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                {mainCategory.title}
              </span>
            )}

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              {post.title}
            </h1>

            {post.subtitle && (
              <p className="mt-2 text-lg text-[#1A1815]/70">{post.subtitle}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
              <div className="flex items-center gap-3">
                {post.author?.image ? (
                  <Image src={urlFor(post.author.image).width(80).height(80).url()} alt={post.author.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CC181F]/10 text-sm font-bold text-[#CC181F]">
                    {(post.author?.name ?? "R")[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    {post.author?.slug?.current ? (
                      <a href={`/author/${post.author.slug.current}`} className="text-sm font-semibold hover:text-[#CC181F]">{post.author.name}</a>
                    ) : (
                      <p className="text-sm font-semibold">{post.author?.name ?? "Redaksi"}</p>
                    )}
                    {post.author?.verified && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#4bef2f" viewBox="0 0 16 16" aria-label="Verified">
                        <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-[#1A1815]/50">
                    Published {tanggal} · {jam} · {estimasiBaca(post.body)} menit baca · {(post.views ?? 0) + 1} Reads
                  </p>
                  {post.updatedAt && (
                    <p className="text-xs text-[#1A1815]/40">
                      Last update: {new Date(post.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {new Date(post.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <ShareButtons title={post.title} url={pageUrl} />
                <ShareMore title={post.title} url={pageUrl} />
              </div>
            </div>

            {/* Featured Image with Lightbox + Caption */}
            {post.mainImage && (
              <ImageLightbox
                src={urlFor(post.mainImage).width(1200).height(675).url()}
                alt={post.subtitle || post.title}
                width={1200}
                height={675}
                caption={(post as any).imageCaption || (post.sourceName ? `Foto: ${post.sourceName}` : (post.subtitle || post.title))}
              />
            )}

            {/* AI Disclosure Badge */}
            {post.aiDisclosure && (
              <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">
                  🤖 Artikel ini disusun oleh AI dari beberapa sumber berita, diverifikasi oleh editor manusia.
                </p>
              </div>
            )}

            {/* Source Attribution Section */}
            {post.sourceAttributions && post.sourceAttributions.length > 0 && (
              <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-blue-800">📎 Sumber Referensi</p>
                <ul className="space-y-1">
                  {post.sourceAttributions.map((source, i) => (
                    <li key={i} className="text-xs text-blue-700">
                      <span className="font-medium">{source.sourceName}</span>
                      {source.sourceUrl && (
                        <>
                          {' — '}
                          <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                            {source.sourceUrl}
                          </a>
                        </>
                      )}
                      {source.accessedAt && (
                        <span className="ml-1 text-blue-500">
                          (diakses {new Date(source.accessedAt).toLocaleDateString('id-ID')})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Font Size Slider */}
            <FontSizeSlider />

            {/* Table of Contents */}
            {headings.length > 0 && (
              <nav aria-label="Daftar Isi" className="my-6 rounded-md border border-black/10 bg-[#1A1815]/[.02] p-4">
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[#CC181F]">Daftar Isi</p>
                <ol className="flex flex-col gap-1.5 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === "h3" ? "ml-4" : h.level === "h4" ? "ml-8" : ""}>
                      <a href={`#${h.id}`} className="text-[#1A1815]/80 hover:text-[#CC181F] hover:underline">{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* In-article ad — after TOC / featured image */}
            <AdSlot slotId="article-in-body-1" className="my-8" />

            {/* Article Body with "Baca Juga" — Smart Insert */}
            {(() => {
              const bodyBlocks = Array.isArray(post.body) ? post.body : [];
              const bacaJugaCount = getBacaJugaCount(wordCount);
              const bacaJugaPosts = related.slice(0, bacaJugaCount);

              // Artikel pendek: render full tanpa Baca Juga
              if (bacaJugaCount === 0 || bacaJugaPosts.length === 0) {
                return (
                  <div className="prose prose-lg max-w-none">
                    <PortableText value={bodyBlocks} components={ptComponents} />
                  </div>
                );
              }

              // Hitung posisi insert untuk setiap Baca Juga
              const ratios = bacaJugaCount === 1
                ? [0.45]
                : bacaJugaCount === 2
                  ? [0.33, 0.63]
                  : [0.25, 0.50, 0.75];

              const positions = ratios.map((r) => findBestInsertPosition(bodyBlocks, r));

              // Render dengan Baca Juga di posisi smart
              const segments: React.ReactNode[] = [];
              let lastIdx = 0;

              positions.forEach((pos, i) => {
                // Render block SEBELUM posisi ini
                if (pos > lastIdx) {
                  segments.push(
                    <div key={`seg-${i}`} className="prose prose-lg max-w-none">
                      <PortableText value={bodyBlocks.slice(lastIdx, pos)} components={ptComponents} />
                    </div>
                  );
                }

                // Render Baca Juga card
                const bj = bacaJugaPosts[i];
                if (bj) {
                  segments.push(
                    <a
                      key={`bj-${i}`}
                      href={articleHref(bj)}
                      className="my-8 block rounded-lg border border-[#CC181F]/20 bg-gradient-to-br from-[#CC181F]/[.03] to-transparent p-5 no-underline transition-all hover:border-[#CC181F]/40 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#CC181F]">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#CC181F]" />
                        Baca Juga
                      </div>
                      <div className="mt-3 flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold leading-snug text-[#1A1815] group-hover:text-[#CC181F]">
                            {bj.title}
                          </p>
                          {bj.categories?.[0]?.title && (
                            <p className="mt-2 text-xs text-[#1A1815]/40">
                              {bj.categories[0].title}
                            </p>
                          )}
                        </div>
                        {bj.mainImage && (
                          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md bg-[#1A1815]/10">
                            <img
                              src={urlFor(bj.mainImage).width(192).height(160).url()}
                              alt={bj.title}
                              width={96}
                              height={80}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          </div>
                        )}
                      </div>
                    </a>
                  );
                }

                lastIdx = pos;
              });

              // Render sisa block terakhir
              if (lastIdx < bodyBlocks.length) {
                segments.push(
                  <div key="seg-last" className="prose prose-lg max-w-none">
                    <PortableText value={bodyBlocks.slice(lastIdx)} components={ptComponents} />
                  </div>
                );
              }

              return <>{segments}</>;
            })()}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-[#1A1815]/10 pt-6">
                {post.tags
                  .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
                  .map((tag) => {
                    const cleanTag = tag.trim();
                    const slugTag = cleanTag.toLowerCase().replace(/\s+/g, "-");
                    return (
                      <a
                        key={cleanTag}
                        href={`/tag/${encodeURIComponent(slugTag)}`}
                        className="rounded-full border border-[#1A1815]/15 px-3 py-1 text-xs text-[#1A1815]/70 hover:border-[#CC181F] hover:text-[#CC181F]"
                      >
                        #{cleanTag}
                      </a>
                    );
                  })}
              </div>
            )}

            {/* Author Box with Verified Badge */}
            <div className="mt-8 border-t border-[#1A1815]/10 pt-6">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#1A1815]/60">Tentang Penulis</p>
              <AuthorBox author={post.author ?? null} />
            </div>

            {/* Follow on Google News */}
            <FollowOnGoogle />

            {/* Mobile-only mid-article ad */}
            <div className="my-8 lg:hidden">
              <AdSlot slotId="article-mobile" />
            </div>

            {/* Reactions */}
            <Reactions postId={post._id} initialCounts={reactions} />

            {/* Comments */}
            <Comments postId={post._id} />

            {/* Related Articles — Berita Terkait */}
            {related.length > getBacaJugaCount(wordCount) && (
              <section className="mt-10 border-t border-[#1A1815]/10 pt-6">
                <h2 className="mb-4 text-lg font-bold">Berita Terkait</h2>
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
                  {related.slice(getBacaJugaCount(wordCount)).map((r) => (
                    <a key={r._id} href={articleHref(r)} className="group flex gap-3 sm:block">
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-[#1A1815]/10 sm:mb-2 sm:aspect-video sm:w-full">
                        {r.mainImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urlFor(r.mainImage).width(300).url()} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <p className="min-w-0 text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#CC181F]">
                        {r.title}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Bottom banner ad */}
            <AdSlot slotId="article-bottom" className="mt-8" />
          </article>

          <ArticleSidebar
            trending={trending}
            popular24h={popular24h}
            popular7d={popular7d}
            popularAll={popular}
          />
        </div>
      </main>
    </div>
  );
}
