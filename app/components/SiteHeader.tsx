import MobileMenu from "./MobileMenu";
import SearchOverlay from "./SearchOverlay";
import DarkModeToggle from "./DarkModeToggle";
import SocialLinks from "./SocialLinks";

interface Category {
  title: string;
  slug: { current: string };
}

export default function SiteHeader({ categories }: { categories: Category[] }) {
  return (
    <header className="border-b border-black/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <MobileMenu categories={categories} />
        <a href="/" className="flex flex-col items-center leading-none">
          <span className="text-2xl font-black tracking-tight text-[#CC181F]">WARTA</span>
          <span className="text-[10px] font-bold tracking-widest text-[#1A1815]">NUSANTARA</span>
        </a>
        <div className="flex items-center gap-2">
          <SearchOverlay />
          <SocialLinks variant="header" />
          <DarkModeToggle />
        </div>
      </div>
      <nav className="overflow-x-auto nav-gradient">
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
