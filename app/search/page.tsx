import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import { articleHref } from "../lib/articleHref";

export const dynamic = "force-dynamic";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
}

async function searchPosts(q: string): Promise<Post[]> {
  if (!q) return [];
  const term = `*${q}*`;
  return client.fetch(
    `*[_type == "post" && (title match $term || excerpt match $term)] | order(publishedAt desc){
      _id,
      title,
      slug,
      excerpt,
      mainImage,
      publishedAt,
      categories[]->{title, slug}
    }`,
    { term }
  );
}

function waktuLalu(tanggal: string) {
  const detik = Math.floor((Date.now() - new Date(tanggal).getTime()) / 1000);
  if (detik < 60) return "Baru saja";
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  return `${hari} hari lalu`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchPosts(query) : [];

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <a href="/" className="text-xs font-semibold uppercase tracking-wide text-[#CC181F]">
            &larr; Kembali ke Beranda
          </a>
          <h1 className="mt-3 text-2xl font-black">Cari Berita</h1>

          <form action="/search" method="GET" className="mt-4 flex max-w-lg gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Ketik kata kunci..."
              className="flex-1 rounded-md border border-black/10 px-4 py-2 text-sm focus:border-[#CC181F] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-[#CC181F] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Cari
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {!query && (
          <p className="py-16 text-center text-[#1A1815]/50">
            Ketik kata kunci di atas untuk mulai mencari berita.
          </p>
        )}

        {query && results.length === 0 && (
          <p className="py-16 text-center text-[#1A1815]/50">
            Tidak ada hasil untuk &ldquo;{query}&rdquo;. Coba kata kunci lain.
          </p>
        )}

        {query && results.length > 0 && (
          <>
            <p className="mb-6 text-sm text-[#1A1815]/50">
              {results.length} hasil untuk &ldquo;{query}&rdquo;
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((post) => (
                <a key={post._id} href={articleHref(post)} className="block">
                  <div className="aspect-[16/10] w-full overflow-hidden rounded bg-[#1A1815]/10">
                    {post.mainImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlFor(post.mainImage).width(500).url()}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  {post.categories?.[0] && (
                    <span className="mt-2 inline-block rounded bg-[#CC181F]/10 px-2 py-0.5 text-xs font-semibold text-[#CC181F]">
                      {post.categories[0].title}
                    </span>
                  )}
                  <h3 className="mt-2 text-lg font-bold leading-snug hover:text-[#CC181F]">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#1A1815]/60 line-clamp-2">{post.excerpt}</p>
                  <p className="mt-2 text-xs text-[#1A1815]/40">{waktuLalu(post.publishedAt)}</p>
                </a>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}