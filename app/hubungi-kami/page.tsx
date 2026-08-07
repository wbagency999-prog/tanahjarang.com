import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Hubungi Kami | Warta Nusantara",
  description: "Hubungi tim Warta Nusantara untuk pertanyaan, saran, atau kerja sama.",
};

export default function HubungiKami() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Hubungi Kami" }]} />
          <h1 className="mt-3 text-3xl font-black">Hubungi Kami</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-lg">
            Kami senang mendengar dari Anda! Jika Anda memiliki pertanyaan, saran, koreksi berita, atau ingin menjalin kerja sama, jangan ragu untuk menghubungi kami.
          </p>

          <section>
            <h2>Email</h2>
            <p>
              Kirim email ke: <a href="mailto:info@tanahjarang.com" className="text-[#CC181F] hover:underline">info@tanahjarang.com</a>
            </p>
          </section>

          <section>
            <h2>Sosial Media</h2>
            <p>Ikuti kami di media sosial untuk mendapatkan berita terkini:</p>
            <ul>
              <li>WhatsApp: Kirim pesan langsung</li>
              <li>Google News: Ikuti Warta Nusantara</li>
            </ul>
          </section>

          <section>
            <h2>Untuk Liputan & Kerja Sama</h2>
            <p>
              Untuk keperluan liputan, press release, atau kerja sama periklanan, silakan email kami dengan subjek yang jelas agar dapat kami proses lebih cepat.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
