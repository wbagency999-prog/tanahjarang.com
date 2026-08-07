import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Warta Nusantara",
  description: "Syarat dan ketentuan penggunaan website Warta Nusantara.",
};

export default function SyaratDanKetentuan() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Syarat dan Ketentuan" }]} />
          <h1 className="mt-3 text-3xl font-black">Syarat dan Ketentuan</h1>
          <p className="mt-2 text-sm text-[#1A1815]/50">Terakhir diperbarui: 5 Agustus 2026</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2>1. Penerimaan Syarat</h2>
            <p>Dengan mengakses dan menggunakan website Warta Nusantara, Anda setuju untuk terikat dengan syarat dan ketentuan ini.</p>
          </section>
          <section>
            <h2>2. Hak Cipta</h2>
            <p>Seluruh konten di website ini dilindungi hak cipta. Dilarang menyalin, memublikasikan, atau mendistribusikan konten tanpa izin tertulis dari Warta Nusantara.</p>
          </section>
          <section>
            <h2>3. Penggunaan Konten</h2>
            <p>Anda diperbolehkan membaca dan membagikan artikel dengan menyertakan tautan sumber asli dari Warta Nusantara.</p>
          </section>
          <section>
            <h2>4. Tautan Eksternal</h2>
            <p>Website ini mungkin berisi tautan ke website pihak ketiga. Warta Nusantara tidak bertanggung jawab atas konten website eksternal.</p>
          </section>
          <section>
            <h2>5. Perubahan Syarat</h2>
            <p>Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
