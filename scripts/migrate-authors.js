// Migration script: Optimize all authors with E-E-A-T data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

// E-E-A-T data untuk setiap author
const authorProfiles = {
  'ahmad-fauzi': {
    role: 'Kepala Redaksi',
    bio: 'Memimpin tim redaksi dengan fokus pada jurnalisme akurat dan terpercaya. Bertanggung jawab atas standar editorial dan kualitas konten portal berita.',
    experience: 'Lebih dari 15 tahun pengalaman di bidang jurnalistik dan editorial. Memiliki keahlian dalam pengelolaan berita nasional dan kebijakan publik.',
    yearsOfExperience: 15,
    specializations: ['Jurnalistik', 'Kebijakan Publik', 'Nasional', 'Editorial'],
    education: 'S1 Ilmu Komunikasi',
    certifications: ['Sertifikasi Jurnalistik Dewan Pers'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'siti-rahmawati': {
    role: 'Editor Teknologi',
    bio: 'Mengelola liputan teknologi dengan pendekatan analitis. Fokus pada perkembangan digital, kecerdasan buatan, dan dampaknya terhadap kehidupan masyarakat.',
    experience: 'Spesialis liputan teknologi dengan pengalaman mendalam dalam analisis tren digital dan inovasi teknologi.',
    yearsOfExperience: 8,
    specializations: ['Teknologi', 'Digital', 'Kecerdasan Buatan', 'Startup'],
    education: 'S1 Teknologi Informasi',
    certifications: ['Google Analytics Certified', 'Digital Marketing'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'budi-prasetyo': {
    role: 'Redaktur Ekonomi & Bisnis',
    bio: 'Mengawasi liputan ekonomi dan bisnis dengan pendekatan data-driven. Berfokus pada analisis pasar, kebijakan moneter, dan tren ekonomi makro.',
    experience: 'Ahli di bidang analisis ekonomi dan pasar modal. Berpengalaman dalam menyajikan data ekonomi yang kompleks menjadi informasi yang mudah dipahami.',
    yearsOfExperience: 12,
    specializations: ['Ekonomi', 'Bisnis', 'Pasar Modal', 'Kebijakan Moneter'],
    education: 'S1 Ekonomi',
    certifications: ['Analyst Chartered Financial Analyst (CFA)'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'anisa-permata': {
    role: 'Reporter Nasional',
    bio: 'Meliput berita nasional dengan pendekatan faktual dan berimbang. Fokus pada isu-isu aktual yang berdampak langsung pada kehidupan masyarakat.',
    experience: 'Reporter lapangan dengan keahlian dalam wawancara mendalam dan investigasi berita nasional.',
    yearsOfExperience: 6,
    specializations: ['Nasional', 'Politik', 'Hukum', 'Sosial'],
    education: 'S1 Ilmu Komunikasi',
    certifications: ['Sertifikasi Jurnalistik Digital'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'rizky-aditya': {
    role: 'Reporter Internasional',
    bio: 'Meliput perkembangan berita internasional dengan analisis mendalam. Fokus pada hubungan diplomatik, geopolitik, dan isu global.',
    experience: 'Spesialis berita internasional dengan kemampuan analisis geopolitik dan hubungan diplomatik.',
    yearsOfExperience: 7,
    specializations: ['Internasional', 'Geopolitik', 'Hubungan Diplomatik', 'Global'],
    education: 'S1 Hubungan Internasional',
    certifications: ['Foreign Affairs Certification'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'dewi-anggraini': {
    role: 'Reporter Olahraga',
    bio: 'Meliput berita olahraga dengan cakupan luas mulai dari liga domestik hingga kompetisi internasional. Fokus pada analisis taktik dan profil atlet.',
    experience: 'Reporter olahraga dengan pengalaman meliput berbagai kompetisi nasional dan internasional.',
    yearsOfExperience: 5,
    specializations: ['Olahraga', 'Sepak Bola', 'Bulutangkis', 'Motorsport'],
    education: 'S1 Ilmu Komunikasi',
    certifications: ['Sports Journalism Certificate'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'hendra-wijaya': {
    role: 'Reporter Hiburan',
    bio: 'Meliput industri hiburan dan gaya hidup dengan pendekatan yang berimbang. Fokus pada tren budaya populer dan profil kreatif.',
    experience: 'Reporter hiburan dengan keahlian dalam liputan industri kreatif dan tren budaya.',
    yearsOfExperience: 4,
    specializations: ['Hiburan', 'Budaya Populer', 'Industri Kreatif', 'Gaya Hidup'],
    education: 'S1 Seni Komunikasi',
    certifications: ['Entertainment Journalism'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'farhan-hakim': {
    role: 'Reporter Pertambangan & Energi',
    bio: 'Meliput sektor pertambangan dan energi dengan analisis teknis. Fokus pada kebijakan energi, mineral, dan dampak lingkungan.',
    experience: 'Spesialis liputan sektor pertambangan dan energi dengan pemahaman teknis yang mendalam.',
    yearsOfExperience: 9,
    specializations: ['Pertambangan', 'Energi', 'Mineral', 'Lingkungan'],
    education: 'S1 Teknik Pertambangan',
    certifications: ['Mining Safety Certification'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'rina-susanti': {
    role: 'Editor Internasional',
    bio: 'Mengelola liputan internasional dengan standar jurnalisme tinggi. Memastikan akurasi dan konteks dalam setiap berita global.',
    experience: 'Editor internasional dengan pengalaman luas dalam verifikasi fakta dan konteks berita global.',
    yearsOfExperience: 10,
    specializations: ['Internasional', 'Verifikasi Fakta', 'Analisis Berita', 'Global'],
    education: 'S1 Ilmu Politik',
    certifications: ['International Journalism Certificate'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'dimas-kurniawan': {
    role: 'Redaktur Pendidikan',
    bio: 'Mengawasi liputan pendidikan dengan fokus pada inovasi pembelajaran dan kebijakan pendidikan nasional.',
    experience: 'Redaktur pendidikan dengan keahlian dalam analisis kebijakan dan tren pendidikan.',
    yearsOfExperience: 7,
    specializations: ['Pendidikan', 'Kebijakan Pendidikan', 'Inovasi Pembelajaran', 'Edukasi'],
    education: 'S1 Pendidikan',
    certifications: ['Education Policy Analysis'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'maya-putri': {
    role: 'Reporter Nasional',
    bio: 'Meliput berita nasional dengan pendekatan faktual. Fokus pada isu-isu sosial dan kebijakan publik yang berdampak pada masyarakat.',
    experience: 'Reporter dengan pengalaman dalam liputan isu sosial dan kebijakan publik.',
    yearsOfExperience: 5,
    specializations: ['Nasional', 'Sosial', 'Kebijakan Publik', 'Hukum'],
    education: 'S1 Ilmu Sosial',
    certifications: ['Public Affairs Reporting'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'warta-nusantara': {
    role: 'Tim Redaksi',
    bio: 'Tim redaksi portal berita Warta Nusantara yang berkomitmen menyajikan informasi akurat, terkini, dan berimbang untuk pembaca Indonesia.',
    experience: 'Portal berita digital yang berfokus pada penyajian berita nasional, internasional, teknologi, olahraga, dan berbagai topik lainnya.',
    yearsOfExperience: 3,
    specializations: ['Nasional', 'Internasional', 'Teknologi', 'Olahraga', 'Ekonomi'],
    education: 'Ilmu Komunikasi dan Jurnalisme Digital',
    certifications: ['Dewan Pers Indonesia'],
    verified: true,
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
  'siti-rahmawati': {
    role: 'Editor Teknologi',
    bio: 'Mengelola liputan teknologi dengan pendekatan analitis. Fokus pada perkembangan digital, kecerdasan buatan, dan dampaknya terhadap kehidupan masyarakat.',
    experience: 'Spesialis liputan teknologi dengan pengalaman mendalam dalam analisis tren digital dan inovasi teknologi.',
    yearsOfExperience: 8,
    specializations: ['Teknologi', 'Digital', 'Kecerdasan Buatan', 'Startup'],
    education: 'S1 Teknologi Informasi',
    certifications: ['Google Analytics Certified', 'Digital Marketing'],
    correctionPolicy: 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
  },
};

// Test entries - update atau hapus
const testEntries = {
  'feri': {
    role: 'Kontributor',
    bio: 'Kontributor artikel untuk portal berita Warta Nusantara.',
    experience: 'Kontributor konten.',
    yearsOfExperience: 2,
    specializations: ['Nasional'],
    education: 'S1 Komunikasi',
    verified: false,
  },
  'dany-mauriz': {
    role: 'Kontributor',
    bio: 'Kontributor artikel untuk portal berita Warta Nusantara.',
    experience: 'Kontributor konten.',
    yearsOfExperience: 2,
    specializations: ['Nasional'],
    education: 'S1 Komunikasi',
    verified: false,
  },
};

(async () => {
  // Update all authors
  const allProfiles = { ...authorProfiles, ...testEntries };
  
  for (const [slug, profile] of Object.entries(allProfiles)) {
    const author = await client.fetch('*[_type == "author" && slug.current == $slug][0]{ _id }', { slug });
    if (!author) {
      console.log(`Author "${slug}" not found, skipping`);
      continue;
    }

    try {
      const patch = client.patch(author._id).set({
        role: profile.role,
        bio: profile.bio ? [
          {
            _type: 'block',
            _key: `bio-${slug}`,
            style: 'normal',
            children: [{ _type: 'span', _key: `bio-text-${slug}`, text: profile.bio }],
            markDefs: [],
          },
        ] : undefined,
        experience: profile.experience,
        yearsOfExperience: profile.yearsOfExperience,
        specializations: profile.specializations,
        education: profile.education,
        certifications: profile.certifications,
        correctionPolicy: profile.correctionPolicy || 'Jika terdapat kesalahan informasi dalam artikel, silakan laporkan melalui email redaksi@tanahjarang.com untuk kami koreksi dan perbarui.',
      });

      if (profile.verified !== undefined) {
        patch.set({ verified: profile.verified });
      }

      await patch.commit();
      console.log(`Updated: ${slug} (${profile.role})`);
    } catch (err) {
      console.log(`Failed to update ${slug}:`, err.message);
    }
  }

  // Delete test entries (FERI and Dany mauriz if not wanted)
  // Uncomment if you want to delete them:
  // for (const slug of ['feri', 'dany-mauriz']) {
  //   const author = await client.fetch('*[_type == "author" && slug.current == $slug][0]{ _id }', { slug });
  //   if (author) {
  //     await client.delete(author._id);
  //     console.log(`Deleted: ${slug}`);
  //   }
  // }

  console.log('\nAll authors updated with E-E-A-T data');
})();
