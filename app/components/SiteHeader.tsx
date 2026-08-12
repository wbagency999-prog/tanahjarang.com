"use client";

import { useState, useEffect } from "react";
import MobileMenu from "./MobileMenu";
import SearchOverlay from "./SearchOverlay";
import DarkModeToggle from "./DarkModeToggle";
import SocialLinks from "./SocialLinks";

interface Category {
  title: string;
  slug: { current: string };
}

export default function SiteHeader({ categories }: { categories: Category[] }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b border-black/5 transition-all duration-300 ${
      scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:py-4">
        <MobileMenu categories={categories} />
        <a href="/" className="flex flex-col items-center leading-none">
          <span className={`font-black tracking-tight text-[#CC181F] transition-all duration-300 ${
            scrolled ? "text-xl lg:text-2xl" : "text-2xl lg:text-2xl"
          }`}>WARTA</span>
          <span className="text-[10px] font-bold tracking-widest text-[#1A1815]">NUSANTARA</span>
        </a>
        <div className="flex items-center gap-2">
          <SearchOverlay />
          <SocialLinks variant="header" />
          <DarkModeToggle />
        </div>
      </div>
      <nav className="overflow-x-auto nav-gradient shadow-sm">
        <div className="mx-auto flex max-w-6xl gap-6 px-4 py-3 text-sm font-semibold text-white">
          <a href="/" className="whitespace-nowrap border-b-2 border-white pb-0.5">Home</a>
          {categories.map((c) => (
            <a key={c.slug.current} href={`/${c.slug.current}`} className="whitespace-nowrap border-b-2 border-transparent pb-0.5 transition-colors hover:border-white">{c.title}</a>
          ))}
          <a href="/komoditas" className="whitespace-nowrap border-b-2 border-transparent pb-0.5 transition-colors hover:border-white">Komoditas</a>
        </div>
      </nav>
    </header>
  );
}
