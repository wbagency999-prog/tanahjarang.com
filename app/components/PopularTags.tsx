"use client";

import { useRef } from "react";

interface Tag {
  name: string;
  count?: number;
}

export default function PopularTags({ tags }: { tags: Tag[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  if (tags.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1815]/60">Tag Populer</h3>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll kiri"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-sm hover:bg-black/5"
          >
            ‹
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll kanan"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-sm hover:bg-black/5"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {tags.map((tag) => (
          <a
            key={tag.name}
            href={`/search?q=${encodeURIComponent(tag.name)}`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-[#1A1815]/[.02] px-4 py-1.5 text-sm text-[#1A1815]/70 transition-colors hover:border-[#CC181F] hover:text-[#CC181F]"
          >
            #{tag.name}
            {tag.count !== undefined && (
              <span className="text-xs text-[#1A1815]/40">({tag.count})</span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
