import type { Metadata } from "next";
import { client } from "@/sanity/client";
import { notFound } from "next/navigation";
import Feed from "../components/Feed";
import Breadcrumb from "../components/Breadcrumb";
import BreakingTicker from "../components/BreakingTicker";
import AdSlot from "../components/AdSlot";
import { urlFor } from "@/sanity/image";
import { waktuLalu } from "../lib/waktuLalu";

export const dynamic = "force-dynamic";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  nasional: "Berita terkini seputar politik, hukum, dan kebijakan nasional Indonesia.",
  internasional: "Kabar dan analisis terbaru dari kancah internasional.",
  teknologi: "Informasi terkini seputar inovasi, gadget, dan perkembangan digital.",
  olahraga: "Kabar terbaru dari dunia sepak bola, bulu tangkis, dan olahraga lainnya.",
  hiburan: "Berita hiburan terkini dari dunia selebriti, film, dan musik.",
  bisnis: "Informasi terbaru seputar ekonomi, pasar modal, dan peluang usaha.",
  pendidikan: "Kabar terkini dari dunia pendidikan, beasiswa, dan tips belajar.",
  otomotif: "Informasi terbaru seputar kendaraan baru, tips otomotif, dan industri otomotif.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";
  const url = `${baseUrl}/${category}`;

  if (!cat) {
    return {
      title: "Kategori Tidak Ditemukan | Warta Nusantara",
      description: "Kategori yang Anda cari tidak ditemukan.",
      alternates: { canonical: url },
    };
  }

  const description =
    cat.description ||
    CATEGORY_DESCRIPTIONS[category] ||
    `Berita terkini kategori ${cat.title} di Warta Nusantara.`;

  return {
    title: `${cat.title} - Berita Terkini | Warta Nusantara`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${cat.title} - Berita Terkini`,
      description,
      type: "website",
      url,
      siteName: "Warta Nusantara",
      locale: "id_ID",
    },
  };
}

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
  views: number;
}

interface Category {
  title: string;
  description?: string;
}

async function getCategory(category: string): Promise<Category | null> {
  return client.fetch(
    `*[_type == "category" && slug.current == $category][0]{ title, description }`,
    { category }
  );
}

async function getTotalPosts(category: string): Promise<number> {
  return client.fetch(
    `count(*[_type == "post" && !(_id in path("drafts.**")) && $category in categories[]->slug.current])`,
    { category }
  );
}

async function getAllPostsByCategory(category: string): Promise<Post[]> {
  return client.fetch(
    `*[_type == "post" && !(_id in path("drafts.**")) && $category in categories[]->slug.current] | order(publishedAt desc)[0...200]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { category }
  );
}

async function getAiArticlesByCategory(category: string): Promise<Post[]> {
  const articles = await client.fetch<any[]>(
    `*[_type == "aiArticle" && status == "published" && $category in categories] | order(publishedAt desc)[0...20]{
      _id, title, slug, leadParagraph, mainImage, publishedAt, categories
    }`,
    { category }
  );
  return articles.map((a) => ({
    _id: a._id,
    title: a.title,
    slug: a.slug,
    excerpt: a.leadParagraph || "",
    mainImage: a.mainImage || null,
    publishedAt: a.publishedAt || "",
    categories: (a.categories || []).map((c: string) => ({
      title: c,
      slug: { current: c },
    })),
    views: 0,
  }));
}

export default async function KategoriPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const now = new Date();
  const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [cat, totalPosts, posts, aiArticles] = await Promise.all([
    getCategory(category),
    getTotalPosts(category),
    getAllPostsByCategory(category),
    getAiArticlesByCategory(category),
  ]);

  if (!cat) {
    notFound();
  }

  // Merge posts + aiArticles, sort by publishedAt
  const allPosts = [...posts, ...aiArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Featured: ambil artikel terbaru di kategori untuk Hero
  const breakingPosts = await client.fetch<Post[]>(
    `*[_type == "post" && $category in categories[]->slug.current] | order(publishedAt desc)[0...5]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { category }
  );

  // Popular: 3 time windows
  const [popular24h, popular7d, popularAll] = await Promise.all([
    client.fetch<Post[]>(
      `*[_type == "post" && $category in categories[]->slug.current && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { category, since: since24h }
    ),
    client.fetch<Post[]>(
      `*[_type == "post" && $category in categories[]->slug.current && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { category, since: since7d }
    ),
    client.fetch<Post[]>(
      `*[_type == "post" && $category in categories[]->slug.current && views > 0] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { category }
    ),
  ]);

  // Trending: 6 jam terakhir (real-time) → fallback 24 jam → fallback all-time
  let trendingPosts = await client.fetch<Post[]>(
    `*[_type == "post" && $category in categories[]->slug.current && publishedAt >= $since] | order(views desc)[0...5]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { category, since: since6h }
  );

  if (trendingPosts.length < 2) {
    const trending24h = await client.fetch<Post[]>(
      `*[_type == "post" && $category in categories[]->slug.current && publishedAt >= $since] | order(views desc)[0...5]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { category, since: since24h }
    );
    if (trending24h.length > trendingPosts.length) trendingPosts = trending24h;
  }

  if (trendingPosts.length === 0) {
    trendingPosts = await client.fetch<Post[]>(
      `*[_type == "post" && $category in categories[]->slug.current] | order(views desc)[0...5]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { category }
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1A1815] via-[#2a2520] to-[#3d3530]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiLz48L3N2Zz4=')] opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <Breadcrumb
            items={[{ name: "Home", href: "/" }, { name: cat.title }]}
            light
          />
          <div className="mt-4 flex items-end gap-4">
            <div className="h-10 w-1 rounded-full bg-[#DC2626]" />
            <h1 className="text-4xl font-black tracking-tight text-white">
              {cat.title}
            </h1>
          </div>
          {cat.description && (
            <p className="mt-3 ml-5 max-w-xl text-sm leading-relaxed text-white/60">
              {cat.description}
            </p>
          )}
          <div className="mt-4 ml-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
              {totalPosts} artikel
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {allPosts.length === 0 && (
          <p className="py-16 text-center text-[#1A1815]/50">
            Belum ada berita di kategori ini.
          </p>
        )}

        <AdSlot slotId="category-top" className="my-6" />

        <Feed
          breakingTicker={<BreakingTicker posts={breakingPosts} />}
          breaking={breakingPosts}
          latest={allPosts}
          popular24h={popular24h}
          popular7d={popular7d}
          popularAll={popularAll}
          trending={trendingPosts}
        />
      </main>
    </div>
  );
}
