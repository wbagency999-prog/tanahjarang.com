import React from "react";
import { client } from "@/sanity/client";
import { notFound } from "next/navigation";
import Breadcrumb from "../../components/Breadcrumb";
import AdSlot from "../../components/AdSlot";
import { articleHref } from "../../lib/articleHref";
import { urlFor } from "@/sanity/image";
import { waktuLalu } from "../../lib/waktuLalu";

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

async function getPostsByTag(tag: string): Promise<Post[]> {
  return (client as any).fetch(
    `*[_type == "post" && tags[] match $tag] | order(publishedAt desc){
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { tag: `*${tag}*` }
  );
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const slugTag = decodeURIComponent(tag);
  // Convert hyphen balik ke spasi untuk query & display
  const displayTag = slugTag.replace(/-/g, " ");
  const posts = await getPostsByTag(displayTag);

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Breadcrumb items={[{ name: "Home", href: "/" }, { name: `#${displayTag}` }]} />
          <h1 className="mt-3 text-3xl font-black">#{displayTag}</h1>
          <p className="mt-1 text-xs text-[#1A1815]/40">{posts.length} artikel</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {posts.length === 0 && (
          <p className="py-16 text-center text-[#1A1815]/50">
            Belum ada artikel dengan tag ini.
          </p>
        )}

        <AdSlot slotId="tag-top" className="mb-6" />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <React.Fragment key={post._id}>
              <a href={articleHref(post)} className="group block">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#1A1815]/10">
                  {post.mainImage && (
                    <img
                      src={urlFor(post.mainImage).width(400).height(225).url()}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                {post.categories?.[0] && (
                  <span className="mt-3 inline-block rounded bg-[#CC181F]/10 px-2 py-0.5 text-xs font-semibold text-[#CC181F]">
                    {post.categories[0].title}
                  </span>
                )}
                <h2 className="mt-2 text-lg font-bold leading-snug group-hover:text-[#CC181F]">
                  {post.title}
                </h2>
                <p className="mt-1 text-sm text-[#1A1815]/60 line-clamp-2">{post.excerpt}</p>
                <p className="mt-2 text-xs text-[#1A1815]/40">
                  {waktuLalu(post.publishedAt)} · {post.views ?? 0}x dibaca
                </p>
              </a>
              {(i + 1) % 6 === 0 && i < posts.length - 1 && (
                <div className="col-span-full">
                  <AdSlot slotId="tag-in-feed" className="my-4" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </main>
    </div>
  );
}
