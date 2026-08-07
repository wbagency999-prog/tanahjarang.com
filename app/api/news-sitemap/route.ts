import { client } from "@/sanity/client";

export const dynamic = "force-dynamic";

const baseUrl = "https://tanahjarang.com";

interface NewsPost {
  slug: { current: string };
  title: string;
  publishedAt: string;
  updatedAt?: string;
  categories: { slug?: { current: string } }[];
  author: { name: string } | null;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET() {
  // Hanya artikel dari 48 jam terakhir (persyaratan Google News)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const posts: NewsPost[] = await client.fetch(
    `*[_type == "post" && publishedAt > $cutoff] | order(publishedAt desc){
      slug,
      title,
      publishedAt,
      updatedAt,
      categories[]->{slug},
      author->{name}
    }`,
    { cutoff }
  );

  const urls = posts.map((post) => {
    const catSlug = post.categories?.[0]?.slug?.current;
    const postUrl = catSlug
      ? `${baseUrl}/${catSlug}/${post.slug.current}`
      : `${baseUrl}/berita/${post.slug.current}`;
    const pubDate = new Date(post.publishedAt).toUTCString();
    const modDate = post.updatedAt
      ? new Date(post.updatedAt).toUTCString()
      : pubDate;

    return `  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>Warta Nusantara</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:title>${escapeXml(post.title)}</news:title>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:modification_date>${modDate}</news:modification_date>
      <news:keywords>berita indonesia, ${escapeXml(post.author?.name || "warta nusantara")}</news:keywords>
    </news:news>
  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
