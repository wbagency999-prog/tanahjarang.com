import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Tentang Kami | Warta Nusantara",
  description: "Mengenal lebih dekat Warta Nusantara — portal berita Indonesia terkini, terpercaya, dan informatif.",
};

export default function TentangKami() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Tentang Kami" }]} />
          <h1 className="mt-3 text-3xl font-black">Tentang Kami</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none">
          {/* Organisation Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsMediaOrganization",
              name: "Warta Nusantara",
              url: "https://tanahjarang.com",
              logo: "https://tanahjarang.com/icon-192.svg",
              description: "Portal berita Indonesia terkini, terpercaya, dan informatif.",
              sameAs: [],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "info@tanahjarang.com",
              },
            }) }}
          />

          <p className="text-lg leading-relaxed">
            <strong>Warta Nusantara</strong> adalah portal berita Indonesia yang menyajikan informasi terkini, terpercaya, dan informatif bagi masyarakat Indonesia.
          </p>
          <p>
            Kami berkomitmen untuk memberikan liputan berita yang akurat dan berimbang, mencakup berbagai bidang mulai dari politik, ekonomi, teknologi, olahraga, hingga gaya hidup.
          </p>

          <h2>Visi Kami</h2>
          <p>Menjadi sumber informasi terpercaya nomor satu bagi masyarakat Indonesia yang menginginkan berita akurat, berimbang, dan mudah dipahami.</p>

          <h2>Misi Kami</h2>
          <ul>
            <li><strong>Akurat:</strong> Setiap berita diverifikasi sebelum dipublikasikan</li>
            <li><strong>Berbumbang:</strong> Menyajikan berbagai sudut pandang secara objektif</li>
            <li><strong>Cepat:</strong> Update berita secara real-time untuk peristiwa terkini</li>
            <li><strong>Terpercaya:</strong> Menjaga independensi dan etika jurnalistik</li>
          </ul>

          <h2>Tim Editorial</h2>
          <p>Warta Nusantara dikelola oleh tim editorial yang berpengalaman di bidang jurnalistik. Setiap artikel melalui proses verifikasi dan editing sebelum dipublikasikan untuk memastikan akurasi informasi.</p>

          <h2>Standar Editorial</h2>
          <ul>
            <li>Semua fakta harus diverifikasi dari sumber yang kredibel</li>
            <li>Membedakan antara fakta dan opini secara jelas</li>
            <li>Menyertakan sumber dan referensi untuk setiap klaim</li>
            <li>Memberikan hak jawab bagi pihak yang disebutkan</li>
          </ul>

          <h2>Kontak</h2>
          <p>
            Email: <a href="mailto:info@tanahjarang.com" className="text-[#CC181F] hover:underline">info@tanahjarang.com</a><br />
            Lihat juga: <a href="/hubungi-kami" className="text-[#CC181F] hover:underline">Halaman Hubungi Kami</a>
          </p>
        </div>
      </main>
    </div>
  );
}
