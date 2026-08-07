import { client } from "@/sanity/client";

export const dynamic = "force-dynamic";

const baseUrl = "https://tanahjarang.com";

interface SitemapPost {
  slug: { current: string };
  publishedAt: string;
  updatedAt?: string;
  categories: { slug?: { current: string } }[];
}

interface SitemapCategory {
  slug: { current: string };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET() {
  const [posts, categories] = await Promise.all([
    client.fetch<SitemapPost[]>(
      `*[_type == "post"] | order(publishedAt desc){
        slug,
        publishedAt,
        updatedAt,
        categories[]->{slug}
      }`
    ),
    client.fetch<SitemapCategory[]>(
      `*[_type == "category" && defined(slug.current)]{ slug }`
    ),
  ]);

  const urls: string[] = [];

  // Static pages
  const staticPages = [
    { path: "/", priority: "1.0", freq: "daily" },
    { path: "/authors", priority: "0.8", freq: "weekly" },
    { path: "/tentang-kami", priority: "0.6", freq: "monthly" },
    { path: "/editorial-policy", priority: "0.4", freq: "yearly" },
    { path: "/ai-disclaimer", priority: "0.4", freq: "yearly" },
    { path: "/kebijakan-privasi", priority: "0.3", freq: "yearly" },
    { path: "/syarat-dan-ketentuan", priority: "0.3", freq: "yearly" },
    { path: "/hubungi-kami", priority: "0.5", freq: "monthly" },
    { path: "/dmca", priority: "0.4", freq: "yearly" },
  ];

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  // Categories
  for (const cat of categories) {
    urls.push(`  <url>
    <loc>${baseUrl}/${cat.slug.current}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Posts
  for (const post of posts) {
    const catSlug = post.categories?.[0]?.slug?.current;
    const postUrl = catSlug
      ? `${baseUrl}/${catSlug}/${post.slug.current}`
      : `${baseUrl}/berita/${post.slug.current}`;
    const lastmod = post.updatedAt || post.publishedAt;

    urls.push(`  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
