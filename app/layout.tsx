import type { Metadata } from "next";
import { client } from "@/sanity/client";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import BackToTop from "./components/BackToTop";
import ScrollProgress from "./components/ScrollProgress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warta Nusantara",
  description: "Portal berita Indonesia terkini, terpercaya, dan informatif.",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  other: {
    "msapplication-TileColor": "#CC181F",
  },
};

const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";

interface Category {
  title: string;
  slug: { current: string };
}

async function getCategories(): Promise<Category[]> {
  return client.fetch(`*[_type == "category" && defined(slug.current) && slug.current != "bisnis-ekonomi"] | order(title asc){ title, slug }`);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CC181F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Warta Nusantara" />
        <link rel="alternate" type="application/rss+xml" title="Warta Nusantara RSS" href={`${baseUrl}/api/rss`} />
        <link rel="sitemap" type="application/xml" href={`${baseUrl}/sitemap.xml`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#1A1815]" suppressHydrationWarning>
        <SiteHeader categories={categories} />
        <div className="flex-1">{children}</div>
        <SiteFooter categories={categories} />
        <ScrollProgress />
        <BackToTop />
      </body>
    </html>
  );
}
