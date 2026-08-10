import { client } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import { articleHref } from "../../lib/articleHref";
import { waktuLalu } from "../../lib/waktuLalu";
import { PortableText } from "@portabletext/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "../../components/Breadcrumb";

export const dynamic = "force-dynamic";

interface SocialLink {
  platform: string;
  url: string;
}

interface Author {
  _id: string;
  name: string;
  slug: { current: string };
  image?: any;
  bio?: any;
  verified?: boolean;
  role?: string;
  experience?: string;
  specializations?: string[];
  education?: string;
  certifications?: string[];
  yearsOfExperience?: number;
  socialLinks?: SocialLink[];
  email?: string;
  correctionPolicy?: string;
}

interface Post {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  mainImage: any;
  publishedAt: string;
  categories: { title: string; slug: { current: string } }[];
  views: number;
}

async function getAuthor(slug: string): Promise<Author | null> {
  return client.fetch(
    `*[_type == "author" && slug.current == $slug][0]{
      _id, name, slug, image, bio, verified,
      role, experience, specializations,
      education, certifications, yearsOfExperience,
      socialLinks, email, correctionPolicy
    }`,
    { slug }
  );
}

async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  return client.fetch(
    `*[_type == "post" && author._ref == $authorId] | order(publishedAt desc){
      _id, title, slug, excerpt, mainImage, publishedAt,
      categories[]->{title, slug}, views
    }`,
    { authorId }
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};
  return {
    title: `${author.name} | Warta Nusantara`,
    description: author.bio
      ? `Profil ${author.name}${author.role ? ` - ${author.role}` : ""} di Warta Nusantara`
      : `Artikel oleh ${author.name} di Warta Nusantara`,
  };
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" />
      </svg>
      Terverifikasi
    </span>
  );
}

export default async function AuthorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const posts = await getPostsByAuthor(author._id);
  const totalViews = posts.reduce((sum, p) => sum + (p.views ?? 0), 0);

  // JSON-LD Structured Data
  const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: `${baseUrl}/author/${author.slug.current}`,
    image: author.image ? urlFor(author.image).width(400).height(400).url() : undefined,
    jobTitle: author.role || undefined,
    description: typeof author.bio === "string" ? author.bio : undefined,
    sameAs: author.socialLinks?.map((l) => l.url).filter(Boolean),
    knowsAbout: author.specializations,
    alumniOf: author.education ? { "@type": "EducationalOrganization", name: author.education } : undefined,
    email: author.email || undefined,
  };

  const hasExperience = author.experience || (author.specializations && author.specializations.length > 0);
  const hasExpertise = author.education || (author.certifications && author.certifications.length > 0);
  const hasSocial = (author.socialLinks && author.socialLinks.length > 0) || author.email;

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[
            { name: "Beranda", href: "/" },
            { name: "Tim Kami", href: "/authors" },
            { name: author.name },
          ]} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-start gap-5 rounded-xl border border-black/10 bg-[#1A1815]/[.02] p-6">
          {author.image ? (
            <img
              src={urlFor(author.image).width(120).height(120).url()}
              alt={author.name}
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-black/5"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1A1815]/5 text-2xl font-bold text-[#1A1815]/60">
              {author.name[0]}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{author.name}</h1>
              {author.verified && <VerifiedBadge />}
            </div>
            {author.role && (
              <p className="mt-1 text-sm font-medium text-[#CC181F]">{author.role}</p>
            )}
            <div className="mt-2 flex gap-4 text-sm text-[#1A1815]/50">
              <span>{posts.length} artikel</span>
              <span className="text-[#1A1815]/20">|</span>
              <span>{totalViews.toLocaleString("id-ID")} dibaca</span>
            </div>
          </div>
        </div>

        {/* E-E-A-T Sections */}
        <div className="mt-8 space-y-6">

          {/* Bio */}
          {author.bio && (
            <section className="rounded-lg border border-black/5 p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#1A1815]/40">Tentang</h2>
              <div className="text-sm leading-relaxed text-[#1A1815]/70">
                {typeof author.bio === "string" ? <p>{author.bio}</p> : <PortableText value={author.bio} />}
              </div>
            </section>
          )}

          {/* Experience & Specializations */}
          {hasExperience && (
            <section className="rounded-lg border border-black/5 p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#1A1815]/40">Pengalaman</h2>
              {author.experience && (
                <p className="text-sm text-[#1A1815]/70">{author.experience}</p>
              )}
              {author.specializations && author.specializations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {author.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full bg-[#1A1815]/5 px-3 py-1 text-xs font-medium text-[#1A1815]/70"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Education & Certifications */}
          {hasExpertise && (
            <section className="rounded-lg border border-black/5 p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#1A1815]/40">Pendidikan & Sertifikasi</h2>
              {author.education && (
                <p className="text-sm text-[#1A1815]/70">
                  <span className="font-semibold">Pendidikan:</span> {author.education}
                </p>
              )}
              {author.certifications && author.certifications.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-[#1A1815]/70">Sertifikasi:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-[#1A1815]/70">
                    {author.certifications.map((cert) => (
                      <li key={cert}>{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Social Links */}
          {hasSocial && (
            <section className="rounded-lg border border-black/5 p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#1A1815]/40">Terhubung</h2>
              <div className="flex flex-wrap gap-3">
                {author.socialLinks?.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm text-[#1A1815]/70 transition-colors hover:border-[#CC181F] hover:text-[#CC181F]"
                  >
                    <span className="capitalize">{link.platform}</span>
                  </a>
                ))}
                {author.email && (
                  <a
                    href={`mailto:${author.email}`}
                    className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm text-[#1A1815]/70 transition-colors hover:border-[#CC181F] hover:text-[#CC181F]"
                  >
                    Email
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Correction Policy */}
          {author.correctionPolicy && (
            <section className="rounded-lg border-l-2 border-l-[#CC181F]/30 bg-[#1A1815]/[.02] p-5">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#1A1815]/40">Kebijakan Koreksi</h2>
              <p className="text-sm leading-relaxed text-[#1A1815]/60">{author.correctionPolicy}</p>
            </section>
          )}
        </div>

        {/* Posts List */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Artikel oleh {author.name}</h2>
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#1A1815]/40">Belum ada artikel dari penulis ini.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {posts.map((post) => (
                <a
                  key={post._id}
                  href={articleHref(post)}
                  className="flex gap-4 border-b border-black/5 pb-5 transition-opacity hover:opacity-80"
                >
                  <div className="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded bg-[#1A1815]/10 sm:w-48">
                    {post.mainImage && (
                      <img
                        src={urlFor(post.mainImage).width(400).url()}
                        alt={post.title}
                        width={192}
                        height={144}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    {post.categories?.[0] && (
                      <span className="rounded bg-[#CC181F]/10 px-2 py-0.5 text-xs font-semibold text-[#CC181F]">
                        {post.categories[0].title}
                      </span>
                    )}
                    <h3 className="mt-2 text-lg font-bold leading-snug hover:text-[#CC181F]">{post.title}</h3>
                    <p className="mt-1 text-sm text-[#1A1815]/60 line-clamp-2">{post.excerpt}</p>
                    <p className="mt-2 text-xs text-[#1A1815]/40">
                      {waktuLalu(post.publishedAt)} &middot; {post.views ?? 0} dibaca
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
