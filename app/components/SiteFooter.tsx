import SocialLinks from "./SocialLinks";

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
  { name: "RSS Feed", href: "/api/rss" },
];

export default function SiteFooter({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-10 border-t border-black/5 bg-[#1A1815]/[.02] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Kategori</h4>
            <ul className="flex flex-col gap-2 text-sm text-[#1A1815]/70">
              {categories.map((c) => (
                <li key={c.slug.current}><a href={`/${c.slug.current}`} className="hover:text-[#CC181F]">{c.title}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Halaman</h4>
            <ul className="flex flex-col gap-2 text-sm text-[#1A1815]/70">
              {halamanMenu.map((h) => (
                <li key={h.href}><a href={h.href} className="hover:text-[#CC181F]">{h.name}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <SocialLinks variant="footer" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Warta Nusantara</h4>
            <p className="text-sm text-[#1A1815]/60">Portal berita Indonesia terkini, terpercaya, dan informatif.</p>
          </div>
        </div>
        <p className="mt-8 border-t border-black/5 pt-6 text-center text-xs text-[#1A1815]/40">© 2026 Warta Nusantara. Semua hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}