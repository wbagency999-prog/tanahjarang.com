import { client } from "@/sanity/client";
import { PortableText } from "@portabletext/react";
import Breadcrumb from "./Breadcrumb";

interface Page {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  body: any[];
}

const ptComponents = {
  types: {
    image: ({ value }: any) => null,
  },
  block: {
    normal: ({ children }: any) => <p>{children}</p>,
    h2: ({ children }: any) => <h2 className="mt-8 mb-4 text-2xl font-bold">{children}</h2>,
    h3: ({ children }: any) => <h3 className="mt-6 mb-3 text-xl font-bold">{children}</h3>,
    h4: ({ children }: any) => <h4 className="mt-4 mb-2 text-lg font-bold">{children}</h4>,
    bullet: ({ children }: any) => <li className="ml-4 mb-1">{children}</li>,
    number: ({ children }: any) => <li className="ml-4 mb-1 list-decimal">{children}</li>,
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
    number: ({ children }: any) => <ol className="mb-4 list-decimal pl-6">{children}</ol>,
  },
  marks: {
    link: ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="nofollow noopener noreferrer" className="text-[#CC181F] hover:underline">
        {children}
      </a>
    ),
  },
};

async function getPage(slug: string): Promise<Page | null> {
  return client.fetch(
    `*[_type == "page" && slug.current == $slug][0]{
      _id, title, slug, description, body
    }`,
    { slug }
  );
}

export default async function PageRenderer({ slug, breadcrumbName }: { slug: string; breadcrumbName: string }) {
  const page = await getPage(slug);

  if (!page) {
    return (
      <div className="min-h-screen bg-white text-[#1A1815]">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-center text-[#1A1815]/50">Halaman tidak ditemukan.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1815]">
      <header className="border-b border-black/5">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Breadcrumb items={[{ name: "Beranda", href: "/" }, { name: breadcrumbName }]} />
          <h1 className="mt-3 text-3xl font-black">{page.title}</h1>
          {page.description && (
            <p className="mt-2 text-sm text-[#1A1815]/50">{page.description}</p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-lg max-w-none">
          <PortableText value={page.body} components={ptComponents} />
        </div>
      </main>
    </div>
  );
}
