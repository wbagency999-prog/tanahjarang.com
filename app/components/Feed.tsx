"use client";

import { useState } from "react";
import Hero from "./Hero";
import LoadMorePosts from "./LoadMorePosts";
import MineralPriceWidget from "./MineralPriceWidget";
import AdSidebar from "./AdSidebar";
import { articleHref } from "../lib/articleHref";
import { waktuLalu } from "../lib/waktuLalu";
import { urlFor } from "@/sanity/image";

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

// Time decay: score = views / (hours_since_publish + 2)^1.5
function decayScore(post: Post): number {
  const hours = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60);
  return (post.views || 0) / Math.pow(hours + 2, 1.5);
}

type TabKey = "24h" | "7d" | "all";

export default function Feed({
  breaking,
  breakingTicker,
  latest,
  popular24h,
  popular7d,
  popularAll,
  trending,
}: {
  breaking: Post[];
  breakingTicker?: React.ReactNode;
  latest: Post[];
  popular24h: Post[];
  popular7d: Post[];
  popularAll: Post[];
  trending: Post[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabData: { key: TabKey; label: string; posts: Post[] }[] = [
    { key: "24h", label: "24 Jam", posts: popular24h },
    { key: "7d", label: "7 Hari", posts: popular7d },
    { key: "all", label: "Semua", posts: popularAll },
  ];

  const activePosts = tabData.find((t) => t.key === activeTab)?.posts || popularAll;

  // Sort by decay score
  const sortedPosts = [...activePosts]
    .sort((a, b) => decayScore(b) - decayScore(a))
    .slice(0, 8);

  // Filter out the featured article from latest to avoid duplication
  const latestWithoutHero = breaking.length > 0
    ? latest.filter((post) => post._id !== breaking[0]._id)
    : latest;

  return (
    <>
      {breakingTicker}
      {breaking.length > 0 && (
        <Hero featured={breaking[0]} topArticles={trending} />
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between border-l-4 border-[#CC181F] pl-3">
            <h3 className="text-xl font-bold">Artikel Terbaru</h3>
          </div>
          <LoadMorePosts posts={latestWithoutHero} />
        </section>

        <aside className="hidden lg:block space-y-6">
          <AdSidebar slotId="feed-sidebar" />

          {/* Most Popular with Tabs */}
          <div className="rounded-xl border border-black/5 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">🔥 Popular</h3>
            </div>

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
                  <a href={articleHref(post)} className="flex items-start gap-3 rounded-md border border-black/5 p-3 hover:bg-black/[.02] transition-colors">
                    <span className={`text-2xl font-black ${
                      i === 0 ? "text-[#CC181F]" : i < 3 ? "text-[#CC181F]/60" : "text-[#1A1815]/20"
                    }`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
                      <p className="mt-1 text-xs text-[#1A1815]/50">
                        {post.categories?.[0]?.title ?? "Umum"}{post.views ? ` · ${post.views}x dibaca` : ''}
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

          <MineralPriceWidget />
        </aside>
      </div>
    </>
  );
}
