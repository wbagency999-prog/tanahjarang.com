import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "Kebijakan DMCA | Warta Nusantara",
  description: "Kebijakan DMCA Warta Nusantara — prosedur pelaporan pelanggaran hak cipta dan perlindungan konten.",
};

export default function DMCAPolicy() {
  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: "Kebijakan DMCA" }]} />
          <h1 className="mt-3 text-3xl font-black">Kebijakan DMCA</h1>
          <p className="mt-2 text-sm text-[#1A1815]/50">Kebijakan Pelaporan Pelanggaran Hak Cipta</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none space-y-8">

          {/* 1. Pernyataan Komitmen */}
          <section>
            <h2 className="text-xl font-bold">1. Pernyataan Komitmen</h2>
            <p>
              Warta Nusantara (tanahjarang.com) berkomitmen penuh untuk menghormati hak cipta dan kekayaan intelektual pihak lain. Kami menerapkan kebijakan yang ketat terkait pelanggaran hak cipta dan akan merespons pemberitahuan yang sah sesuai dengan Undang-Undang Hak Cipta Digital Milenium (Digital Millennium Copyright Act / DMCA) tahun 1998.
            </p>
            <p>
              Semua konten yang dipublikasikan di Warta Nusantara harus mematuhi hukum hak cipta yang berlaku. Jika Anda adalah pemilik hak cipta atau yang bertindak atas nama pemilik hak cipta dan yakin bahwa materi yang dipublikasikan di situs kami melanggar hak cipta Anda, silakan beritahu kami sesuai prosedur yang dijelaskan di bawah ini.
            </p>
          </section>

          {/* 2. Definisi Hak Cipta */}
          <section>
            <h2 className="text-xl font-bold">2. Definisi Hak Cipta</h2>
            <p>
              Hak cipta adalah hak eksklusif yang diberikan oleh undang-undang kepada pencipta karya asli untuk mengontrol penggunaan, distribusi, dan reproduksi karya tersebut. Ini mencakup:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Teks tulisan, artikel, dan karya literatur lainnya</li>
              <li>Foto, gambar, dan karya visual lainnya</li>
              <li>Video, audio, dan musik</li>
              <li>Perangkat lunak dan kode program</li>
              <li>Karya seni dan desain grafis</li>
            </ul>
            <p>
              Penggunaan materi berhak cipta tanpa izin dari pemiliknya merupakan pelanggaran hak cipta yang dapat dikenakan sanksi hukum.
            </p>
          </section>

          {/* 3. Kebijakan Penggunaan Konten */}
          <section>
            <h2 className="text-xl font-bold">3. Kebijakan Penggunaan Konten</h2>

            <h3 className="text-base font-semibold mt-4">3.1 Penggunaan yang Diizinkan</h3>
            <p>Pengunjung diperbolehkan untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Membaca dan mengakses artikel untuk keperluan pribadi</li>
              <li>Membagikan artikel melalui tautan langsung (direct link) ke halaman asli di Warta Nusantara</li>
              <li>Mengutip potongan singkat (fair use) dengan mencantumkan sumber dan tautan asli</li>
              <li>Mencetak artikel untuk keperluan pribadi atau edukasi</li>
            </ul>

            <h3 className="text-base font-semibold mt-4">3.2 Penggunaan yang Dilarang</h3>
            <p>Pengunjung dilarang untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Menyalin seluruh atau sebagian besar artikel dan mempublikasikannya kembali tanpa izin tertulis</li>
              <li>Menggunakan konten untuk keperluan komersial tanpa lisensi</li>
              <li>Mengubah, memodifikasi, atau membuat karya turunan dari konten tanpa izin</li>
              <li>Mendistribusikan ulang konten melalui platform lain (situs web, media sosial, dll) tanpa atribusi yang memadai</li>
              <li>Menggunakan foto atau gambar dari situs ini untuk keperluan komersial tanpa izin</li>
            </ul>
          </section>

          {/* 4. Prosedur Pelaporan DMCA */}
          <section>
            <h2 className="text-xl font-bold">4. Prosedur Pelaporan Pelanggaran DMCA</h2>
            <p>Jika Anda yakin bahwa materi yang dipublikasikan di Warta Nusantara melanggar hak cipta Anda, silakan kirimkan pemberitahuan yang sah kepada DMCA Agent kami melalui informasi kontak di bawah ini.</p>

            <h3 className="text-base font-semibold mt-4">4.1 Isi Pemberitahuan DMCA</h3>
            <p>Pemberitahuan harus memuat informasi berikut:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Tanda tangan elektronik atau fisik</strong> dari pemilik hak cipta atau orang yang berwenang bertindak atas namanya
              </li>
              <li>
                <strong>Identifikasi karya berhak cipta</strong> yang diklaim telah dilanggar. Jika ada beberapa karya, sertakan daftar lengkap
              </li>
              <li>
                <strong>Identifikasi materi yang melanggar</strong> dan lokasi (URL) di situs kami di mana materi tersebut berada. Sertakan informasi yang cukup memadai untuk memungkinkan kami menemukan materi tersebut
              </li>
              <li>
                <strong>Informasi kontak Anda</strong>, termasuk alamat, nomor telepon, dan alamat email
              </li>
              <li>
                <strong>Pernyataan</strong> bahwa Anda menggunakan niat baik bahwa penggunaan materi dengan cara yang dikeluhkan tidak diizinkan oleh pemilik hak cipta, agennya, atau hukum
              </li>
              <li>
                <strong>Pernyataan</strong> bahwa informasi dalam pemberitahuan tersebut akurat, dan di bawah sumpah atau pernyataan bahwa Anda adalah pemilik hak cipta atau orang yang berwenang bertindak atas namanya
              </li>
              <li>
                <strong>Tanda tangan</strong> fisik atau elektronik dari pemilik hak cipta atau orang yang berwenang
              </li>
            </ol>
          </section>

          {/* 5. Informasi Kontak DMCA Agent */}
          <section className="rounded-lg border border-[#CC181F]/20 bg-[#CC181F]/[.03] p-5">
            <h2 className="text-xl font-bold">5. Informasi Kontak DMCA Agent</h2>
            <p>Untuk melaporkan pelanggaran DMCA, silakan hubungi:</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><strong>DMCA Agent</strong></p>
              <p>Warta Nusantara</p>
              <p>Email: <a href="mailto:dmca@tanahjarang.com" className="text-[#CC181F] hover:underline">dmca@tanahjarang.com</a></p>
              <p>Email Alternatif: <a href="mailto:redaksi@tanahjarang.com" className="text-[#CC181F] hover:underline">redaksi@tanahjarang.com</a></p>
            </div>
            <p className="mt-3 text-sm text-[#1A1815]/60">
              Harap sertakan kata "DMCA Notice" pada baris subjek email agar laporan Anda dapat segera ditangani.
            </p>
          </section>

          {/* 6. Proses Peninjauan */}
          <section>
            <h2 className="text-xl font-bold">6. Proses Peninjauan</h2>
            <p>Setelah menerima pemberitahuan DMCA yang sah, kami akan:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Meninjau pemberitahuan dan memverifikasi kelengkapan informasi</li>
              <li>Mengidentifikasi materi yang dilaporkan di situs kami</li>
              <li>Menghapus atau memblokir akses ke materi yang dilaporkan jika pemberitahuan dinyatakan sah</li>
              <li>Memberitahu pengguna yang mempublikasikan materi tersebut tentang penghapusan atau pemblokiran</li>
              <li>Mencatat pemberitahuan dan tindakan yang diambil</li>
            </ol>
            <p className="mt-2 text-sm text-[#1A1815]/60">
              Kami berusaha merespons setiap pemberitahuan DMCA dalam waktu 48 jam kerja sejak pemberitahuan diterima.
            </p>
          </section>

          {/* 7. Counter-Notice */}
          <section>
            <h2 className="text-xl font-bold">7. Prosedur Counter-Notice</h2>
            <p>
              Jika Anda yakin bahwa materi yang dihapus atau diblokir aksesnya tidak melanggar hak cipta, atau bahwa Anda memiliki izin dari pemilik hak cipta untuk menggunakan materi tersebut, Anda dapat mengirimkan Counter-Notice kepada DMCA Agent kami.
            </p>
            <p>Counter-Notice harus memuat:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Tanda tangan fisik atau elektronik</li>
              <li>Identifikasi materi yang dihapus atau diblokir aksesnya</li>
              <li>Pernyataan di bawah sumpah bahwa materi dihapus atau diblokir karena kesalahan atau identifikasi yang keliru</li>
              <li>Nama, alamat, dan nomor telepon Anda</li>
              <li>Pernyataan bahwa Anda tunduk pada yurisdiksi pengadilan federal di wilayah Anda</li>
              <li>Pernyataan bahwa Anda akan menerima layanan proses dari pemilik hak cipta</li>
            </ol>
          </section>

          {/* 8. Pengulangan Pelanggaran */}
          <section>
            <h2 className="text-xl font-bold">8. Pengulangan Pelanggaran</h2>
            <p>
              Sesuai dengan DMCA dan kebijakan kami, Warta Nusantara akan membatasi akses pengguna yang secara berulang melanggar hak cipta. Kami berhak untuk, atas kebijaksanaan kami, membatasi atau menghentikan akses ke situs ini bagi pengguna yang dianggap melanggar hak cipta secara berulang.
            </p>
          </section>

          {/* 9. Modifikasi Kebijakan */}
          <section>
            <h2 className="text-xl font-bold">9. Modifikasi Kebijakan</h2>
            <p>
              Warta Nusantara berhak memodifikasi kebijakan DMCA ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Perubahan akan berlaku efektif segera setelah dipublikasikan di halaman ini. Dengan terus menggunakan situs kami setelah perubahan tersebut, Anda dianggap menyetujui kebijakan yang telah diperbarui.
            </p>
          </section>

          {/* 10. Disclaimer */}
          <section>
            <h2 className="text-xl font-bold">10. Disclaimer</h2>
            <p className="text-sm text-[#1A1815]/60">
              Informasi di halaman ini bukan merupakan nasihat hukum. Untuk pertanyaan hukum spesifik terkait hak cipta atau DMCA, konsultasikan dengan pengacara yang berlisensi. Warta Nusantara tidak bertanggung jawab atas penggunaan informasi di halaman ini untuk tujuan selain prosedur pelaporan DMCA yang sah.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
