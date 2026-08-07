import { urlFor } from "@/sanity/image";
import { articleHref } from "../lib/articleHref";
import { waktuLalu } from "../lib/waktuLalu";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: any;
  categories: { title: string; slug: { current: string } }[];
  publishedAt: string;
  views: number;
}

export default function Hero({ featured, topArticles }: { featured: Post; topArticles: Post[] }) {
  if (!featured) return null;
  const sideItems = topArticles.filter((p) => p._id !== featured._id).slice(0, 3);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Featured Article */}
      <a href={articleHref(featured)} className="group relative block aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#1A1815]/10">
        {featured.mainImage && (
          <img
            src={urlFor(featured.mainImage).width(900).height(506).url()}
            alt={featured.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#CC181F] via-[#CC181F]/85 to-transparent px-5 pb-5 pt-16">
          {featured.categories?.[0] && (
            <span className="inline-block rounded-sm bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#CC181F]">
              {featured.categories[0].title}
            </span>
          )}
          <h2 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
            {featured.title}
          </h2>
          <p className="mt-1 text-xs text-white/70">{waktuLalu(featured.publishedAt)}</p>
        </div>
      </a>

      {/* Top Artikel Sidebar */}
      {sideItems.length > 0 && (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-gradient-to-r from-[#CC181F]/[.06] to-transparent px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#CC181F]">🔥 Top Artikel</p>
          </div>
          <div className="flex flex-1 flex-col divide-y divide-black/5">
            {sideItems.map((post, i) => (
              <a key={post._id} href={articleHref(post)} className="group flex flex-1 items-center gap-3 p-3 transition-colors hover:bg-[#CC181F]/[.02]">
                <div className="relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#1A1815]/10">
                  {post.mainImage && (
                    <img
                      src={urlFor(post.mainImage).width(128).height(128).url()}
                      alt={post.title}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                  {/* Ranking badge */}
                  <span className={`absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    i === 0 ? "bg-[#CC181F]" : i === 1 ? "bg-[#CC181F]/80" : "bg-[#CC181F]/60"
                  }`}>
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  {post.categories?.[0] && (
                    <span className="text-xs font-bold uppercase tracking-wide text-[#CC181F]">{post.categories[0].title}</span>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[#CC181F]">{post.title}</p>
                  <p className="mt-1 text-xs text-[#1A1815]/40">{waktuLalu(post.publishedAt)} · {post.views ?? 0}x</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
