"use client";

import { useState, useEffect } from "react";

interface Category {
  title: string;
  slug: { current: string };
}

const halamanMenu = [
  { name: "Tim Kami", href: "/authors" },
  { name: "Tentang Kami", href: "/tentang-kami" },
  { name: "Kebijakan Editorial", href: "/editorial-policy" },
  { name: "Pernyataan AI", href: "/ai-disclaimer" },
  { name: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { name: "Syarat dan Ketentuan", href: "/syarat-dan-ketentuan" },
  { name: "Hubungi Kami", href: "/hubungi-kami" },
  { name: "Kebijakan DMCA", href: "/dmca" },
];

export default function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-lg">☰</span> Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Tutup" className="text-2xl leading-none">×</button>
            </div>

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A1815]/50">Kategori</h3>
            <ul className="mb-6 flex flex-col gap-2">
              {categories.map((c) => (
                <li key={c.slug.current}>
                  <a href={`/${c.slug.current}`} onClick={() => setOpen(false)} className="block py-1 text-sm hover:text-[#CC181F]">{c.title}</a>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="text-sm text-[#1A1815]/40">Belum ada kategori</li>
              )}
            </ul>

            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1A1815]/50">Halaman</h3>
            <ul className="flex flex-col gap-2">
              {halamanMenu.map((h) => (
                <li key={h.href}>
                  <a href={h.href} onClick={() => setOpen(false)} className="block py-1 text-sm hover:text-[#CC181F]">{h.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}