"use client";

import React, { useState } from "react";
import AdSlot from "./AdSlot";
import { urlFor } from "@/sanity/image";
import { articleHref } from "../lib/articleHref";

interface Post {
  _id: string;
  title: string;
  slug: { current: string } | null;
  excerpt: string;
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
  views: number;
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

const PAGE_SIZE = 10;

export default function LoadMorePosts({ posts }: { posts: Post[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = posts.slice(0, visible);
  const hasMore = visible < posts.length;

  return (
    <>
      <div className="flex flex-col gap-5">
        {shown.map((post, i) => (
          <React.Fragment key={post._id}>
            <a href={post.slug ? articleHref(post) : "#"} className="article-card flex gap-4 rounded-lg p-3 last:border-0">
              <div className="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded bg-[#1A1815]/10 sm:w-48">
                {post.mainImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlFor(post.mainImage).width(400).url()} alt={post.title} width={192} height={144} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                {post.categories?.[0] && (
                  <span className="rounded bg-[#CC181F]/10 px-2 py-0.5 text-xs font-semibold text-[#CC181F]">{post.categories[0].title}</span>
                )}
                <h4 className="mt-2 text-lg font-bold leading-snug">{post.title}</h4>
                <p className="mt-1 text-sm text-[#1A1815]/60 line-clamp-2">{post.excerpt}</p>
                <p className="mt-2 text-xs text-[#1A1815]/40">{waktuLalu(post.publishedAt)} · {post.views ?? 0}x dibaca</p>
              </div>
            </a>
            {(i + 1) % 5 === 0 && i < shown.length - 1 && (
              <AdSlot slotId="feed-in-article" className="my-2" />
            )}
          </React.Fragment>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-[#1A1815]/50">Tambah beberapa berita lagi di Sanity Studio biar bagian ini terisi.</p>
        )}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-[#CC181F] px-6 py-2 text-sm font-semibold text-[#CC181F] hover:bg-[#CC181F] hover:text-white"
          >
            Load More
          </button>
        </div>
      )}

      {!hasMore && posts.length > PAGE_SIZE && (
        <p className="mt-4 text-center text-xs text-[#1A1815]/30">Semua artikel sudah ditampilkan</p>
      )}
    </>
  );
}
