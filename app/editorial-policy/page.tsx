import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Kebijakan Editorial | Warta Nusantara",
  description: "Kebijakan editorial Warta Nusantara — standar penulisan, verifikasi fakta, dan etika jurnalistik.",
};

export default function EditorialPolicy() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Kebijakan Editorial" }]} />
          <h1 className="mt-3 text-3xl font-black">Kebijakan Editorial</h1>
          <p className="mt-2 text-sm text-[#1A1815]/50">Bagaimana kami memproduksi konten berita</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2>Standar Penulisan</h2>
            <p>Semua konten di Warta Nusantara ditulis berdasarkan standar jurnalistik Indonesia yang berlaku. Penulis wajib:</p>
            <ul>
              <li>Memverifikasi fakta dari minimal 2 sumber berbeda</li>
              <li>Memberikan hak jawab bagi pihak yang disebutkan dalam berita</li>
              <li>Membedakan antara berita (fakta) dan opini secara jelas</li>
              <li>Menyertakan sumber dan referensi untuk setiap klaim</li>
            </ul>
          </section>

          <section>
            <h2>Verifikasi Fakta</h2>
            <p>Sebelum artikel dipublikasikan, dilakukan proses verifikasi fakta oleh tim editor yang terpisah dari penulis. Verifikasi meliputi:</p>
            <ul>
              <li>Keakuratan data dan angka yang disebutkan</li>
              <li>Validitas kutipan dan sumber</li>
              <li>Konsistensi informasi dengan sumber terpercaya</li>
              <li>Kesesuaian dengan peraturan perundang-undangan yang berlaku</li>
            </ul>
          </section>

          <section>
            <h2>Etika Jurnalistik</h2>
            <p>Warta Nusantara menerapkan prinsip-prinsip etika jurnalistik:</p>
            <ul>
              <li><strong>Independensi:</strong> Berita ditulis tanpa pengaruh pihak manapun</li>
              <li><strong>Objektivitas:</strong> Menyajikan fakta secara berimbang tanpa bias</li>
              <li><strong>Transparansi:</strong> Menyebutkan sumber informasi secara terbuka</li>
              <li><strong>Akuntabilitas:</strong> Bersedia memperbaiki kesalahan jika ditemukan</li>
            </ul>
          </section>

          <section>
            <h2>Koreksi dan Hak Jawab</h2>
            <p>Jika ditemukan kesalahan dalam artikel kami, kami berkomitmen untuk:</p>
            <ul>
              <li>Memperbaiki kesalahan secepat mungkin</li>
              <li>Memberikan koreksi yang jelas dan transparan</li>
              <li>Memberikan hak jawab bagi pihak yang dirugikan</li>
            </ul>
            <p>Untuk koreksi atau hak jawab, hubungi: <a href="mailto:editor@tanahjarang.com" className="text-[#CC181F]">editor@tanahjarang.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
