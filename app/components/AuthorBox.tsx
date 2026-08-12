import { urlFor } from "@/sanity/image";
import { PortableText } from "@portabletext/react";

interface Author {
  name: string;
  slug?: { current: string };
  image?: any;
  bio?: any;
  verified?: boolean;
  role?: string;
}

export default function AuthorBox({ author }: { author: Author | null }) {
  if (!author) return null;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-black/10 bg-[#1A1815]/[.02] p-4">
      {author.image ? (
        <img
          src={urlFor(author.image).width(80).height(80).url()}
          alt={author.name}
          width={56}
          height={56}
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1A1815]/5 text-lg font-bold text-[#1A1815]/60">
          {(author.name ?? "?")[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {author.slug?.current ? (
            <a href={`/author/${author.slug.current}`} className="text-sm font-bold hover:text-[#CC181F]">
              {author.name}
            </a>
          ) : (
            <p className="text-sm font-bold">{author.name}</p>
          )}
          {author.verified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" />
              </svg>
              Terverifikasi
            </span>
          )}
        </div>
        {author.role && (
          <p className="mt-0.5 text-xs font-medium text-[#CC181F]">{author.role}</p>
        )}
        {author.bio && (
          <div className="mt-1 text-xs text-[#1A1815]/60 line-clamp-2">
            {typeof author.bio === "string" ? (
              author.bio
            ) : Array.isArray(author.bio) ? (
              <PortableText value={author.bio} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
