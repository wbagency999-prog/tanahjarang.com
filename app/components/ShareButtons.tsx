"use client";

import { useState } from "react";

export default function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const waLink = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
  const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const tgLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-[#1A1815]/60">Share</span>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        WhatsApp
      </a>
      <a
        href={fbLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Facebook"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90"
      >
        f
      </a>
      <a
        href={tgLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke Telegram"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0088cc] text-white text-xs font-bold hover:opacity-90"
      >
        T
      </a>
      <button
        onClick={copyLink}
        aria-label="Salin tautan"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1815]/10 text-sm hover:bg-[#1A1815]/20"
      >
        {copied ? "✓" : "🔗"}
      </button>
    </div>
  );
}