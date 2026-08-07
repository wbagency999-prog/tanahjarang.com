import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const dynamic = "force-dynamic";

interface Author {
  _id: string;
  name: string;
  slug: { current: string };
  image?: any;
  bio?: any;
  verified?: boolean;
  role?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  postCount: number;
  totalViews: number;
}

export const metadata: Metadata = {
  title: "Tim Kami | Warta Nusantara",
  description:
    "Kenali tim jurnalis profesional Warta Nusantara yang berkomitmen menyajikan berita akurat dan terpercaya.",
};

async function getAllAuthors(): Promise<Author[]> {
  // Fetch authors
  const authors = await client.fetch<any[]>(
    `*[_type == "author"] | order(name asc) {
      _id, name, slug, image, bio, verified, role,
      specializations, yearsOfExperience
    }`
  );

  // Fetch post counts & views per author
  const enriched = await Promise.all(
    authors.map(async (author) => {
      const stats = await client.fetch<{ count: number; totalViews: number }>(
        `{
          "count": count(*[_type == "post" && author._ref == $id]),
          "totalViews": *[_type == "post" && author._ref == $id].views
        }`,
        { id: author._id }
      )
      return {
        ...author,
        postCount: stats.count || 0,
        totalViews: Array.isArray(stats.totalViews)
          ? stats.totalViews.reduce((sum: number, v: number) => sum + (v || 0), 0)
          : 0,
      }
    })
  )

  return enriched
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-emerald-200">
      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
        <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" />
      </svg>
      Terverifikasi
    </span>
  );
}

function AuthorCard({ author }: { author: Author }) {
  return (
    <a
      href={`/author/${author.slug.current}`}
      className="group block rounded-xl border border-black/5 bg-white p-5 transition-all hover:border-black/10 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        {author.image ? (
          <img
            src={urlFor(author.image).width(80).height(80).url()}
            alt={author.name}
            width={56}
            height={56}
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-black/5 transition-all group-hover:ring-[#CC181F]/20"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1A1815]/5 text-lg font-bold text-[#1A1815]/40 transition-all group-hover:bg-[#CC181F]/10 group-hover:text-[#CC181F]">
            {author.name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold group-hover:text-[#CC181F]">{author.name}</h3>
            {author.verified && <VerifiedBadge />}
          </div>
          {author.role && (
            <p className="mt-0.5 text-xs font-medium text-[#CC181F]/80">{author.role}</p>
          )}
        </div>
      </div>

      {author.specializations && author.specializations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {author.specializations.slice(0, 3).map((spec) => (
            <span
              key={spec}
              className="rounded-full bg-[#1A1815]/5 px-2 py-0.5 text-[10px] font-medium text-[#1A1815]/60"
            >
              {spec}
            </span>
          ))}
          {author.specializations.length > 3 && (
            <span className="rounded-full bg-[#1A1815]/5 px-2 py-0.5 text-[10px] text-[#1A1815]/40">
              +{author.specializations.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-3 text-[11px] text-[#1A1815]/40">
        <span>{author.postCount} artikel</span>
        <span>{(author.totalViews ?? 0).toLocaleString("id-ID")} dibaca</span>
      </div>
    </a>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-baseline gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <span className="text-xs text-[#1A1815]/30">({count})</span>
    </div>
  );
}

export default async function AuthorsPage() {
  const allAuthors = await getAllAuthors();

  // Group by role category
  const kepalaRedaksi = allAuthors.filter((a) => a.role?.includes("Kepala Redaksi"));
  const redakturEditor = allAuthors.filter(
    (a) => a.role?.includes("Redaktur") || a.role?.includes("Editor") || a.role?.includes("Tim Redaksi")
  );
  const reporter = allAuthors.filter((a) => a.role?.includes("Reporter"));
  const kontributor = allAuthors.filter((a) => a.role?.includes("Kontributor"));

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tim Redaksi Warta Nusantara",
    description: "Daftar jurnalis profesional Warta Nusantara",
    url: "https://tanahjarang.com/authors",
    itemListElement: allAuthors.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tanahjarang.com/author/${a.slug.current}`,
      name: a.name,
    })),
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-black/5">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Breadcrumb items={[
            { name: "Beranda", href: "/" },
            { name: "Tim Kami" },
          ]} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-black">Tim Kami</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#1A1815]/60">
            {allAuthors.length} jurnalis profesional yang berkomitmen menyajikan informasi akurat, terkini, dan berimbang untuk pembaca Indonesia.
          </p>
        </div>

        {/* Kepala Redaksi */}
        {kepalaRedaksi.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Kepala Redaksi" count={kepalaRedaksi.length} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kepalaRedaksi.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          </section>
        )}

        {/* Redaktur & Editor */}
        {redakturEditor.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Redaktur & Editor" count={redakturEditor.length} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {redakturEditor.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          </section>
        )}

        {/* Reporter */}
        {reporter.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Reporter" count={reporter.length} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reporter.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          </section>
        )}

        {/* Kontributor */}
        {kontributor.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Kontributor" count={kontributor.length} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kontributor.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          </section>
        )}

        {allAuthors.length === 0 && (
          <div className="py-16 text-center text-sm text-[#1A1815]/40">
            Belum ada data penulis.
          </div>
        )}
      </main>
    </div>
  );
}
