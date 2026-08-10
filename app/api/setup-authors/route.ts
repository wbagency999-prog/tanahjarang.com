// ═══════════════════════════════════════════════════════════
//  SETUP AUTHORS — 10 Profil Author E-E-A-T Lengkap
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/writeClient'
import { client } from '@/sanity/client'

export const dynamic = 'force-dynamic'

// Helper: buat bio Portable Text block
function bio(text: string) {
  return [
    {
      _type: 'block',
      _key: `bio-${text.substring(0, 20).replace(/\s/g, '-')}`,
      style: 'normal',
      children: [{ _type: 'span', _key: `span-${text.substring(0, 20).replace(/\s/g, '-')}`, text }],
      markDefs: [],
    },
  ]
}

// Helper: download foto dari pravatar dan upload ke Sanity
async function uploadPhoto(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const asset = await writeClient.assets.upload('image', buffer, {
      filename: `author-${Date.now()}.jpg`,
    })
    return asset._id
  } catch {
    return null
  }
}

const AUTHORS = [
  {
    name: 'Ahmad Fauzi',
    slug: 'ahmad-fauzi',
    photoUrl: 'https://i.pravatar.cc/300?img=11',
    role: 'Kepala Redaksi',
    bio: 'Ahmad Fauzi adalah kepala redaksi Warta Nusantara dengan pengalaman lebih dari 15 tahun di bidang jurnalistik. Spesialisasinya meliputi politik dalam negeri dan kebijakan publik.',
    verified: true,
    experience: 'Meliput isu politik dan kebijakan publik sejak 2010. Pernah menjadi koordinator liputan khusus Pemilu 2014 dan 2019.',
    specializations: ['Politik Dalam Negeri', 'Kebijakan Publik', 'Pemilu'],
    education: 'S2 Ilmu Politik Universitas Indonesia (2012), S1 Jurnalistik IPB (2009)',
    certifications: ['Wartawan Utama Dewan Pers', 'Sertifikasi Peliputan Politik Press Council'],
    previousMedia: 'Kompas (2010-2018), Tempo (2018-2022), CNN Indonesia (2022-2024)',
    awards: ['Juara 1 Liputan Berita Politik Terbaik SIWO 2020', 'Nominator Pulitzer International 2021 (kategori International Reporting)'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/ahmadfauzi' },
      { platform: 'twitter', url: 'https://twitter.com/ahmadfauzi_jkt' },
    ],
    email: 'ahmad.fauzi@tanahjarang.com',
    correctionPolicy: 'Jika menemukan kesalahan informasi dalam artikel, silakan hubungi ahmad.fauzi@tanahjarang.com dengan menyertakan link artikel dan koreksi yang dimaksud.',
  },
  {
    name: 'Siti Rahmawati',
    slug: 'siti-rahmawati',
    photoUrl: 'https://i.pravatar.cc/300?img=5',
    role: 'Editor Teknologi',
    bio: 'Siti Rahmawati adalah editor teknologi yang fokus meliput perkembangan AI, startup, dan transformasi digital di Indonesia.',
    verified: true,
    experience: 'Menulis tentang teknologi sejak 2016. Telah meliput lebih dari 200 produk dan startup Indonesia.',
    specializations: ['Kecerdasan Buatan', 'Startup & Fintech', 'Transformasi Digital'],
    education: 'S1 Teknik Informatika Institut Teknologi Bandung (2014)',
    certifications: ['Google News Initiative Training', 'AWS Cloud Practitioner'],
    previousMedia: 'DailySocial (2016-2019), TechInAsia (2019-2021), CNBC Indonesia Tekno (2021-2024)',
    awards: ['Best Tech Journalist Indonesia Digital Award 2022'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/sitirahmawati' },
      { platform: 'twitter', url: 'https://twitter.com/siti_tech' },
      { platform: 'website', url: 'https://sitirahmawati.com' },
    ],
    email: 'siti.rahmawati@tanahjarang.com',
  },
  {
    name: 'Budi Prasetyo',
    slug: 'budi-prasetyo',
    photoUrl: 'https://i.pravatar.cc/300?img=12',
    role: 'Redaktur Ekonomi & Bisnis',
    bio: 'Budi Prasetyo memiliki pengalaman panjang meliput pasar modal, kebijakan moneter, dan ekonomi makro Indonesia. Analisisnya sering dijadikan referensi oleh pelaku pasar.',
    verified: true,
    experience: 'Reporter ekonomi sejak 2008. Pernah meliput krisis keuangan 2008, pandemi COVID-19, dan dinamika pasar modal Indonesia.',
    specializations: ['Pasar Modal', 'Ekonomi Makro', 'Kebijakan Moneter', 'Perbankan'],
    education: 'S2 Ekonomi Pembangunan Universitas Gadjah Mada (2010), S1 Manajemen Universitas Diponegoro (2007)',
    certifications: ['Analyst Chartered Financial Analyst (CFA) Level II', 'Wartawan Utama Dewan Pers'],
    previousMedia: 'Bisnis Indonesia (2008-2015), Kontan (2015-2020), CNBC Indonesia (2020-2024)',
    awards: ['Juara 1 Liputan Ekonomi Terbaik PWI 2019', 'Best Financial Reporting AJI Award 2021'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/budiprasetyo' },
      { platform: 'twitter', url: 'https://twitter.com/budi_ekonomi' },
    ],
    email: 'budi.prasetyo@tanahjarang.com',
  },
  {
    name: 'Dewi Anggraini',
    slug: 'dewi-anggraini',
    photoUrl: 'https://i.pravatar.cc/300?img=9',
    role: 'Reporter Olahraga',
    bio: 'Dewi Anggraini adalah reporter olahraga yang meliput sepak bola nasional dan internasional. Dikenal dengan liputan mendalam dan wawancara eksklusif dengan atlet.',
    verified: true,
    experience: 'Meliput olahraga sejak 2014. Pernah meliput Asian Games 2018, Piala Dunia 2022, dan SEA Games 2023.',
    specializations: ['Sepak Bola', 'Bulutangkis', 'Olimpiade', 'Atletik'],
    education: 'S1 Ilmu Komunikasi Universitas Padjadjaran (2013)',
    certifications: ['Akreditasi Wartawan Olahraga SIWO', 'IPSF Media Accreditation'],
    previousMedia: 'Bola.com (2014-2018), Kompas Bola (2018-2022), CNN Indonesia Olahraga (2022-2024)',
    awards: ['Liputan Terbaik Asian Games 2018 - SIWO'],
    socialLinks: [
      { platform: 'twitter', url: 'https://twitter.com/dewi_sport' },
      { platform: 'instagram', url: 'https://instagram.com/dewi.anggraini' },
    ],
    email: 'dewi.anggraini@tanahjarang.com',
  },
  {
    name: 'Rizky Aditya',
    slug: 'rizky-aditya',
    photoUrl: 'https://i.pravatar.cc/300?img=33',
    role: 'Reporter Internasional',
    bio: 'Rizky Aditya meliput berita internasional dengan fokus pada diplomasi, konflik geopolitik, dan hubungan ASEAN. Berpengalaman meliput dari luar negeri.',
    verified: true,
    experience: 'Koresponden internasional sejak 2015. Pernah bertugas di Washington D.C., Tokyo, dan Bangkok.',
    specializations: ['Diplomasi Internasional', 'Geopolitik ASEAN', 'Hubungan AS-Tiongkok'],
    education: 'S2 Hubungan Internasional Universitas Indonesia (2014), S1 Ilmu Politik UGM (2012)',
    certifications: ['Foreign Correspondents Club (FCC) Member', 'Reuters Digital Journalism Certificate'],
    previousMedia: 'Antara News (2015-2018), VOA Indonesia (2018-2021), BBC Indonesia (2021-2024)',
    awards: ['ASEAN Media Award 2022', 'Best International Report CNN Indonesia Award 2023'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/rizkyaditya' },
      { platform: 'twitter', url: 'https://twitter.com/rizky_intl' },
    ],
    email: 'rizky.aditya@tanahjarang.com',
  },
  {
    name: 'Maya Putri',
    slug: 'maya-putri',
    photoUrl: 'https://i.pravatar.cc/300?img=25',
    role: 'Reporter Kesehatan',
    bio: 'Maya Putri adalah reporter kesehatan yang meliput isu kesehatan masyarakat, farmasi, dan kebijakan kesehatan nasional. Dikenal dengan penulisan yang mudah dipahami masyarakat awam.',
    verified: true,
    experience: 'Meliput isu kesehatan sejak 2017. Pernah menjadi reporter utama liputan pandemi COVID-19 di Indonesia.',
    specializations: ['Kesehatan Masyarakat', 'Farmasi', 'Epidemiologi', 'Gizi'],
    education: 'S1 Kesehatan Masyarakat Universitas Indonesia (2016)',
    certifications: ['WHO Media Fellowship 2021', 'Google Health Reporting Certificate'],
    previousMedia: 'KlikDokter (2017-2019), Hello Sehat (2019-2021), Kompas Kesehatan (2021-2024)',
    awards: ['Liputan Kesehatan Terbaik PWI 2020', 'WHO Excellence in Health Reporting 2021'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/mayaputri' },
      { platform: 'twitter', url: 'https://twitter.com/maya_kesehatan' },
    ],
    email: 'maya.putri@tanahjarang.com',
  },
  {
    name: 'Hendra Wijaya',
    slug: 'hendra-wijaya',
    photoUrl: 'https://i.pravatar.cc/300?img=53',
    role: 'Reporter Hiburan & Selebriti',
    bio: 'Hendra Wijaya meliput industri hiburan Indonesia dari dalam ke luar. Dikenal luas di kalangan artis dan produser karena liputannya yang akurat dan adil.',
    verified: true,
    experience: 'Meliput industri hiburan sejak 2013. Pernah meliput festival film internasional di Cannes dan Berlin.',
    specializations: ['Industri Film', 'Musik', 'Festival', 'Selebriti'],
    education: 'S1 Seni Rupa Institut Kesenian Jakarta (2012)',
    certifications: ['Festival Accreditation - Cannes Film Festival 2022', 'Berlinale Press Accreditation 2023'],
    previousMedia: 'Liputan6 Hiburan (2013-2017), Kompas Hiburan (2017-2020), Detik Hot (2020-2024)',
    awards: ['Best Entertainment Reporting CNN Indonesia Award 2022'],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/hendra_hiburan' },
      { platform: 'twitter', url: 'https://twitter.com/hendra_arts' },
    ],
    email: 'hendra.wijaya@tanahjarang.com',
  },
  {
    name: 'Anisa Permata',
    slug: 'anisa-permata',
    photoUrl: 'https://i.pravatar.cc/300?img=44',
    role: 'Reporter Nasional',
    bio: 'Anisa Permata adalah reporter nasional yang fokus pada isu kemiskinan, ketenagakerjaan, dan kesejahteraan sosial. Liputannya sering mengangkat suara masyarakat terpinggirkan.',
    verified: true,
    experience: 'Reporter investigasi sejak 2015. Pernah melakukan liputan mendalam di Papua, NTT, dan Kalimantan.',
    specializations: ['Kemiskinan', 'Ketenagakerjaan', 'Kesejahteraan Sosial', 'Hak Asasi Manusia'],
    education: 'S2 Sosiologi Universitas Gadjah Mada (2017), S1 Ilmu Komunikasi UNAIR (2014)',
    certifications: ['AJI Investigative Journalism Certificate', 'ICFJ International Reporting Fellowship 2022'],
    previousMedia: 'Tirto.id (2015-2019), The Jakarta Post (2019-2022), Kompas (2022-2024)',
    awards: ['Juara 1 Liputan Investigasi AJI Award 2021', 'IPPI Best Human Rights Reporting 2023'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/anisapermata' },
      { platform: 'twitter', url: 'https://twitter.com/anisa_nasional' },
    ],
    email: 'anisa.permata@tanahjarang.com',
  },
  {
    name: 'Dimas Kurniawan',
    slug: 'dimas-kurniawan',
    photoUrl: 'https://i.pravatar.cc/300?img=15',
    role: 'Redaktur Pendidikan',
    bio: 'Dimas Kurniawan meliput isu pendidikan dari jenjang SD hingga perguruan tinggi. Fokus pada kebijakan pendidikan, kurikulum, dan akses pendidikan di daerah terpencil.',
    verified: true,
    experience: 'Reporter pendidikan sejak 2016. Telah mengunjungi lebih dari 50 sekolah di daerah 3T (Terdepan, Terluar, Tertinggal).',
    specializations: ['Kebijakan Pendidikan', 'Kurikulum', 'Pendidikan Daerah 3T', 'Beasiswa'],
    education: 'S2 Pendidikan Universitas Negeri Jakarta (2018), S1 Pendidikan FKIP Universitas Muhammadiyah Jakarta (2015)',
    certifications: ['UNESCO Media and Information Literacy Certificate'],
    previousMedia: 'Republika Pendidikan (2016-2019), Merdeka Pendidikan (2019-2022), CNN Indonesia Pendidikan (2022-2024)',
    awards: ['Liputan Pendidikan Terbaik PWI 2022'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/dimasp' },
      { platform: 'twitter', url: 'https://twitter.com/dimas_pendidikan' },
    ],
    email: 'dimas.kurniawan@tanahjarang.com',
  },
  {
    name: 'Rina Susanti',
    slug: 'rina-susanti',
    photoUrl: 'https://i.pravatar.cc/300?img=47',
    role: 'Editor Internasional',
    bio: 'Rina Susanti adalah editor internasional yang mengawasi cakupan berita dunia. Memiliki jaringan koresponden luas di Asia Tenggara, Eropa, dan Timur Tengah.',
    verified: true,
    experience: 'Editor berita internasional sejak 2014. Pernah menjadi foreign editor di dua media nasional.',
    specializations: ['Timur Tengah', 'Eropa', 'Diplomasi ASEAN', 'Krisis Kemanusiaan'],
    education: 'S2 Studi Pembangunan London School of Economics (2013), S1 Hubungan Internasional UI (2011)',
    certifications: ['Reuters Digital Journalism Certificate', 'Dart Center for Journalism and Trauma'],
    previousMedia: 'Metro TV News (2014-2018), CNN Indonesia (2018-2021), Kompas (2021-2024)',
    awards: ['Best Foreign News Coverage SIWO 2021', 'UNHCR Media Award 2022'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/rinasusanti' },
      { platform: 'twitter', url: 'https://twitter.com/rina_intl' },
    ],
    email: 'rina.susanti@tanahjarang.com',
  },
  {
    name: 'Farhan Hakim',
    slug: 'farhan-hakim',
    photoUrl: 'https://i.pravatar.cc/300?img=59',
    role: 'Reporter Pertambangan & Energi',
    bio: 'Farhan Hakim adalah reporter spesialis pertambangan dan energi. Dikenal sebagai salah satu wartawan yang paling paham industri pertambangan Indonesia.',
    verified: true,
    experience: 'Meliput industri pertambangan sejak 2012. Pernah bertugas di lokasi tambang di Papua, Sulawesi, dan Kalimantan.',
    specializations: ['Pertambangan', 'Energi Terbarukan', 'Nikel & EV Battery', 'Kebijakan ESDM'],
    education: 'S1 Teknik Pertambangan Institut Teknologi Bandung (2011)',
    certifications: ['Mining Journalist Certification - Indonesian Mining Association', 'ILO Occupational Safety Reporting Certificate'],
    previousMedia: 'Indonesia Mining (2012-2016), CNBC Indonesia Energi (2016-2020), Katadata (2020-2024)',
    awards: ['Juara 1 Liputan Pertambangan Terbaik APBI 2020', 'Best Energy Reporting TEMPO Award 2022'],
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/farhanhakim' },
      { platform: 'twitter', url: 'https://twitter.com/farhan_tambang' },
    ],
    email: 'farhan.hakim@tanahjarang.com',
  },
]

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const pipelineSecret = process.env.PIPELINE_SECRET
  if (!pipelineSecret || secret !== pipelineSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs: string[] = []

  for (const author of AUTHORS) {
    try {
      const existing = await client.fetch<{ _id: string } | null>(
        `*[_type == "author" && slug.current == $slug][0]{ _id }`,
        { slug: author.slug }
      )

      // Upload foto
      let imageRef: any = undefined
      if (author.photoUrl) {
        const assetId = await uploadPhoto(author.photoUrl)
        if (assetId) {
          imageRef = { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
          logs.push(`📸 Foto "${author.name}" diupload`)
        } else {
          logs.push(`⚠️ Foto "${author.name}" gagal diupload`)
        }
      }

      const authorData = {
        _type: 'author' as const,
        name: author.name,
        slug: { _type: 'slug' as const, current: author.slug },
        bio: bio(author.bio),
        verified: author.verified,
        role: author.role,
        experience: author.experience,
        specializations: author.specializations,
        education: author.education,
        certifications: author.certifications,
        previousMedia: author.previousMedia,
        awards: author.awards,
        socialLinks: author.socialLinks,
        email: author.email,
        correctionPolicy: author.correctionPolicy,
        ...(imageRef ? { image: imageRef } : {}),
      }

      if (existing) {
        await writeClient.patch(existing._id).set(authorData).commit()
        logs.push(`✅ Author "${author.name}" diupdate`)
      } else {
        await writeClient.create(authorData)
        logs.push(`✅ Author "${author.name}" dibuat`)
      }
    } catch (error: any) {
      logs.push(`❌ Error "${author.name}": ${error.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    total: AUTHORS.length,
    logs,
  })
}
