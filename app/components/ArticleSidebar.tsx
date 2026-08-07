"use client";

import { useState } from "react";
import { articleHref } from "../lib/articleHref";
import { waktuLalu } from "../lib/waktuLalu";
import { urlFor } from "@/sanity/image";
import AdSidebar from "./AdSidebar";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage?: any;
  publishedAt: string;
  categories?: { title?: string; slug?: { current: string } }[];
  views?: number;
}

function decayScore(post: Post): number {
  const hours = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60);
  return (post.views || 0) / Math.pow(hours + 2, 1.5);
}

type TabKey = "24h" | "7d" | "all";

export default function ArticleSidebar({
  trending,
  popular24h,
  popular7d,
  popularAll,
}: {
  trending: Post[];
  popular24h: Post[];
  popular7d: Post[];
  popularAll: Post[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabData: { key: TabKey; label: string; posts: Post[] }[] = [
    { key: "24h", label: "24 Jam", posts: popular24h },
    { key: "7d", label: "7 Hari", posts: popular7d },
    { key: "all", label: "Semua", posts: popularAll },
  ];

  const activePosts = tabData.find((t) => t.key === activeTab)?.posts || popularAll;
  const sortedPosts = [...activePosts]
    .sort((a, b) => decayScore(b) - decayScore(a))
    .slice(0, 6);

  // Filter trending: exclude current article (handled by caller)
  const trendingItems = trending.slice(0, 3);

  return (
    <aside className="space-y-6">
      <AdSidebar slotId="article-sidebar" />

      {/* Top Artikel — Trending 6 jam */}
      {trendingItems.length > 0 && (
        <div className="rounded-xl border border-black/5 bg-gradient-to-br from-[#CC181F]/[.03] to-transparent p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-black/5 pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#CC181F] text-xs font-bold text-white">
              🔥
            </span>
            <h3 className="text-sm font-bold">Top Artikel</h3>
          </div>
          <div className="space-y-3">
            {trendingItems.map((post, i) => (
              <a
                key={post._id}
                href={articleHref(post)}
                className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-[#CC181F]/[.03]"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  i === 0 ? "bg-[#CC181F] text-white" : "bg-[#CC181F]/15 text-[#CC181F]"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[#CC181F]">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs text-[#1A1815]/40">
                    {waktuLalu(post.publishedAt)} · {post.views ?? 0} dibaca
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Most Popular — dengan Tab Filter */}
      <div className="rounded-xl border border-black/5 bg-gradient-to-br from-slate-50 to-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">🔥 Popular</h3>

        {/* Tab Filter */}
        <div className="mb-3 flex gap-1 rounded-lg bg-black/[.03] p-0.5">
          {tabData.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-[#CC181F] text-white shadow-sm"
                  : "text-[#1A1815]/50 hover:text-[#1A1815]/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ol className="flex flex-col gap-2">
          {sortedPosts.map((post, i) => (
            <li key={post._id}>
              <a href={articleHref(post)} className="flex items-start gap-3 rounded-md border border-black/5 p-3 transition-colors hover:bg-black/[.02]">
                <span className={`text-2xl font-black ${
                  i === 0 ? "text-[#CC181F]" : i < 3 ? "text-[#CC181F]/60" : "text-[#1A1815]/20"
                }`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
                  <p className="mt-1 text-xs text-[#1A1815]/50">
                    {post.categories?.[0]?.title ?? "Umum"} · {post.views ?? 0}x dibaca
                  </p>
                </div>
              </a>
            </li>
          ))}
          {sortedPosts.length === 0 && (
            <li className="text-sm text-[#1A1815]/40">Belum ada data.</li>
          )}
        </ol>
      </div>
    </aside>
  );
}
