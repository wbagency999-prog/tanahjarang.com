import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-8xl font-black text-[#CC181F]">404</p>
      <h1 className="mb-3 text-2xl font-bold">Halaman Tidak Ditemukan</h1>
      <p className="mb-6 max-w-md text-[#1A1815]/60">
        Sepertinya halaman yang Anda cari sudah dipindahkan, dihapus, atau tidak tersedia.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#CC181F] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Kembali ke Beranda
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-[#CC181F] px-6 py-2.5 text-sm font-semibold text-[#CC181F] hover:bg-[#CC181F]/5"
        >
          Cari Berita
        </Link>
      </div>
    </div>
  );
}
