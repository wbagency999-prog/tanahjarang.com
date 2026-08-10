import { client } from "@/sanity/client";
import Feed from "./components/Feed";
import BreakingTicker from "./components/BreakingTicker";
import CurrencyRatesFetcher from "./components/CurrencyRatesFetcher";
import AdSlot from "./components/AdSlot";

export const dynamic = "force-dynamic";

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

async function getAllPosts(): Promise<Post[]> {
  return client.fetch<Post[]>(
    `*[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc)[0...200]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`
  );
}

async function getAiArticles(): Promise<Post[]> {
  const articles = await client.fetch<any[]>(
    `*[_type == "aiArticle" && status == "published"] | order(publishedAt desc)[0...20]{
      _id, title, slug, leadParagraph, mainImage, publishedAt, categories
    }`
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

export default async function Home() {
  const [allPosts, aiArticles] = await Promise.all([
    getAllPosts(),
    getAiArticles(),
  ]);

  // Merge posts + aiArticles, sort by publishedAt
  const mergedPosts = [...allPosts, ...aiArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const now = new Date();
  const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Featured: ambil artikel terbaru untuk Hero
  const breakingPosts = await client.fetch<Post[]>(
    `*[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc)[0...5]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`
  );

  // Popular: 3 time windows
  const [popular24h, popular7d, popularAll] = await Promise.all([
    client.fetch<Post[]>(
      `*[_type == "post" && !(_id in path("drafts.**")) && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { since: since24h }
    ),
    client.fetch<Post[]>(
      `*[_type == "post" && !(_id in path("drafts.**")) && views > 0 && publishedAt >= $since] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { since: since7d }
    ),
    client.fetch<Post[]>(
      `*[_type == "post" && !(_id in path("drafts.**")) && views > 0] | order(views desc)[0...8]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`
    ),
  ]);

  // Trending: artikel 6 jam terakhir (real-time), sort by views
  const trendingPosts = await client.fetch<Post[]>(
    `*[_type == "post" && !(_id in path("drafts.**")) && publishedAt >= $since] | order(views desc)[0...5]{
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { since: since6h }
  );

  // Fallback trending: jika kurang dari 2, extend ke 24 jam
  let finalTrending = trendingPosts;
  if (trendingPosts.length < 2) {
    const trending24h = await client.fetch<Post[]>(
      `*[_type == "post" && !(_id in path("drafts.**")) && publishedAt >= $since] | order(views desc)[0...5]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`,
      { since: since24h }
    );
    finalTrending = trending24h.length > trendingPosts.length ? trending24h : trendingPosts;
  }

  // Fallback trending: jika masih kosong, ambil semua waktu
  if (finalTrending.length === 0) {
    finalTrending = await client.fetch<Post[]>(
      `*[_type == "post" && !(_id in path("drafts.**"))] | order(views desc)[0...5]{
        _id, title, slug, excerpt, mainImage, publishedAt,
        categories[]->{title, slug}, views
      }`
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {mergedPosts.length === 0 && (
        <p className="py-16 text-center text-[#1A1815]/50">Belum ada berita. Tulis artikel pertamamu di Sanity Studio.</p>
      )}

      <CurrencyRatesFetcher />

      <AdSlot slotId="homepage-top" className="my-6" />

      <Feed
        breakingTicker={<BreakingTicker posts={breakingPosts} />}
        breaking={breakingPosts}
        latest={mergedPosts}
        popular24h={popular24h}
        popular7d={popular7d}
        popularAll={popularAll}
        trending={finalTrending}
      />
    </main>
  );
}
