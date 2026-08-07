import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";

export const dynamic = "force-dynamic";

interface Post {
  title: string;
  slug: { current: string };
  excerpt: string;
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
  author: { name: string } | null;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts: Post[] = await client.fetch(
    `*[_type == "post"] | order(publishedAt desc)[0...50]{
      title,
      slug,
      excerpt,
      mainImage,
      publishedAt,
      categories[]->{title, slug},
      author->{name}
    }`
  );

  const baseUrl = "https://tanahjarang.com";

  const items = posts
    .map((post) => {
      const categorySlug = post.categories?.[0]?.slug?.current;
      const url = categorySlug
        ? `${baseUrl}/${categorySlug}/${post.slug.current}`
        : `${baseUrl}/berita/${post.slug.current}`;
      const imageUrl = post.mainImage
        ? urlFor(post.mainImage).width(1200).height(675).url()
        : "";
      const pubDate = new Date(post.publishedAt).toUTCString();

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt || "")}</description>
      ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg" />` : ""}
      <category>${escapeXml(post.categories?.[0]?.title || "Umum")}</category>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(post.author?.name || "Redaksi")}</author>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Warta Nusantara</title>
    <link>${baseUrl}</link>
    <description>Portal berita Indonesia terkini, terpercaya, dan informatif.</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
