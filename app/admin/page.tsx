'use client'

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1815]">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Warta Nusantara — Portal Berita</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[#1A1815]">Status</h2>
        <p className="text-gray-600">
          Dashboard admin untuk mengelola konten dan pengaturan website.
        </p>
        <div className="mt-4">
          <a
            href="/"
            className="inline-block rounded-lg bg-[#CC181F] px-6 py-3 font-semibold text-white transition-all hover:bg-[#a51419]"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  )
}
