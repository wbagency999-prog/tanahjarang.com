import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Pernyataan Penggunaan AI | Warta Nusantara",
  description: "Pernyataan transparansi penggunaan kecerdasan buatan (AI) di Warta Nusantara.",
};

export default function AIDisclaimer() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Pernyataan Penggunaan AI" }]} />
          <h1 className="mt-3 text-3xl font-black">Pernyataan Penggunaan AI</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2>Penggunaan Kecerdasan Buatan</h2>
            <p>Warta Nusantara mungkin menggunakan teknologi kecerdasan buatan (AI) dalam beberapa aspek operasional kami:</p>
            <ul>
              <li><strong>Bantuan Penulisan:</strong> AI dapat digunakan sebagai alat bantu untuk merangkum informasi, mengecek fakta, atau menyusun draft awal. Namun, setiap konten tetap melewati proses review dan editing oleh tim editorial manusia.</li>
              <li><strong>Analisis Data:</strong> AI dapat digunakan untuk menganalisis tren berita dan data numerik.</li>
              <li><strong>Saran Konten:</strong> AI dapat membantu mengidentifikasi topik yang relevan untuk liputan.</li>
            </ul>
          </section>

          <section>
            <h2>Jaminan Kualitas</h2>
            <ul>
              <li>Semua konten yang dipublikasikan telah direview oleh editor manusia</li>
              <li>Informasi diverifikasi dari sumber yang kredibel sebelum dipublikasikan</li>
              <li>Kami tidak menggunakan AI untuk membuat konten yang menyesatkan atau hoaks</li>
              <li>Setiap kesalahan akan diperbaiki dengan transparan</li>
            </ul>
          </section>

          <section>
            <h2>Transparansi</h2>
            <p>Jika sebuah artikel menggunakan bantuan AI secara signifikan dalam proses penulisannya, kami akan menyertakan catatan khusus di artikel tersebut.</p>
            <p>Untuk pertanyaan lebih lanjut mengenai penggunaan AI di website kami, hubungi: <a href="mailto:editor@tanahjarang.com" className="text-[#CC181F]">editor@tanahjarang.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
