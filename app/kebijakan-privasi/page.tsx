import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | Warta Nusantara",
  description: "Kebijakan privasi website Warta Nusantara — bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.",
};

export default function KebijakanPrivasi() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Kebijakan Privasi" }]} />
          <h1 className="mt-3 text-3xl font-black">Kebijakan Privasi</h1>
          <p className="mt-2 text-sm text-[#1A1815]/50">Terakhir diperbarui: 5 Agustus 2026</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2>1. Informasi yang Kami Kumpulkan</h2>
            <p>Kami dapat mengumpulkan informasi berikut saat Anda mengunjungi website kami:</p>
            <ul>
              <li>Data penggunaan website (halaman yang dikunjungi, durasi kunjungan)</li>
              <li>Informasi perangkat (jenis browser, sistem operasi)</li>
              <li>Alamat IP (untuk keamanan dan analitik)</li>
            </ul>
          </section>
          <section>
            <h2>2. Penggunaan Informasi</h2>
            <p>Informasi yang dikumpulkan digunakan untuk:</p>
            <ul>
              <li>Meningkatkan kualitas layanan dan konten website</li>
              <li>Analitik pengunjung untuk memahami preferensi pembaca</li>
              <li>Keamanan website dari penyalahgunaan</li>
            </ul>
          </section>
          <section>
            <h2>3. Cookie</h2>
            <p>Website kami menggunakan cookie untuk meningkatkan pengalaman pengguna. Anda dapat mengatur browser Anda untuk menolak cookie.</p>
          </section>
          <section>
            <h2>4. Tautan Eksternal</h2>
            <p>Website kami mungkin berisi tautan ke website pihak ketiga. Kami tidak bertanggung jawab atas konten atau kebijakan privasi website eksternal tersebut.</p>
          </section>
          <section>
            <h2>5. Perubahan Kebijakan</h2>
            <p>Kami berhak memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan akan dipublikasikan di halaman ini.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
