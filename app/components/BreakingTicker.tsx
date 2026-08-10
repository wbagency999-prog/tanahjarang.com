"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  categories: { slug?: { current: string } }[];
}

export default function BreakingTicker({ posts }: { posts: Post[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const lastTimeRef = useRef<number>(0);

  // Time-based scroll: konsisten di semua frame rate
  const animate = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const now = performance.now();
    const delta = lastTimeRef.current ? now - lastTimeRef.current : 16;
    lastTimeRef.current = now;

    const speed = 0.04; // pixels per millisecond → ~24px/detik di 60fps
    const scrollAmount = speed * delta;

    if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
      el.scrollLeft = 0;
    } else {
      el.scrollLeft += scrollAmount;
    }

    // Sync dot indicator dengan scroll position
    const itemWidth = el.scrollWidth / (posts.length || 1);
    const currentIndex = Math.floor((el.scrollLeft + el.clientWidth / 2) / itemWidth) % posts.length;
    setActiveIndex(currentIndex);
  }, [posts.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let paused = false;

    function loop() {
      if (!paused) animate();
      animationId = requestAnimationFrame(loop);
    }

    animationId = requestAnimationFrame(loop);

    const handleMouseEnter = () => { paused = true; };
    const handleMouseLeave = () => { paused = false; lastTimeRef.current = 0; };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [animate]);

  if (posts.length === 0) return null;

  const catSlug = (p: Post) => p.categories?.[0]?.slug?.current || "";

  return (
    <div className="relative border-b border-[#CC181F]/20 bg-gradient-to-r from-[#CC181F]/[.08] via-[#CC181F]/[.04] to-transparent">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-[#CC181F]/[.02] animate-pulse" />

      <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        {/* Breaking badge with pulse dot */}
        <span className="relative shrink-0 flex items-center gap-1.5 rounded bg-[#CC181F] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Breaking
        </span>

        {/* Scrolling headlines */}
        <div
          ref={scrollRef}
          className="overflow-hidden"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-8 whitespace-nowrap">
            {posts.map((post) => (
              <a
                key={post._id}
                href={`/${catSlug(post)}/${post.slug.current}`}
                className="flex items-center gap-2 text-sm text-[#1A1815]/80 hover:text-[#CC181F] transition-colors"
              >
                <span className="inline-block h-1 w-1 rounded-full bg-[#CC181F]/40" />
                {post.title}
              </a>
            ))}
          </div>
        </div>

        {/* Dot indicators — sinkron dengan scroll */}
        {posts.length > 1 && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {posts.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? "w-4 bg-[#CC181F]" : "w-1.5 bg-[#CC181F]/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
