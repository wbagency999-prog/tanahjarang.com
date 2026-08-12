"use client";

import { useState, useEffect } from "react";

interface ShareMoreProps {
  title: string;
  url: string;
}

export default function ShareMore({ title, url }: ShareMoreProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const shareOptions = [
    {
      name: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      color: "#000000",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      color: "#0088cc",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      color: "#0A66C2",
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Baca ini: ${url}`)}`,
      color: "#EA4335",
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Share lainnya"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1815]/10 text-sm hover:bg-[#1A1815]/20"
      >
        ⋯
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Bagikan</h3>
              <button onClick={() => setOpen(false)} className="text-2xl leading-none text-[#1A1815]/50 hover:text-[#1A1815]">×</button>
            </div>
            <p className="mb-4 line-clamp-2 text-sm text-[#1A1815]/60">{title}</p>
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-3 text-sm font-semibold transition-colors hover:bg-black/[.03]"
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
