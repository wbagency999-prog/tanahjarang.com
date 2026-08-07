import { urlFor } from "@/sanity/image";
import { articleHref } from "../lib/articleHref";
import { waktuLalu } from "../lib/waktuLalu";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
  views: number;
}

export default function NowTrending({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">⚡ Now Trending</h3>
      <ol className="flex flex-col gap-3">
        {posts.map((post, i) => (
          <li key={post._id}>
            <a href={articleHref(post)} className="group flex items-start gap-3 rounded-md border border-black/5 p-3 hover:bg-black/[.02] transition-colors">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="flex gap-3">
                <div className="aspect-square h-14 w-14 shrink-0 overflow-hidden rounded bg-[#1A1815]/10">
                  {post.mainImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urlFor(post.mainImage).width(112).height(112).url()}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  {post.categories?.[0] && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
                      {post.categories[0].title}
                    </span>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[#CC181F]">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs text-[#1A1815]/40">
                    {waktuLalu(post.publishedAt)} · {post.views ?? 0}x dibaca
                  </p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
