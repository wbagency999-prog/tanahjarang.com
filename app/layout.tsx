import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora } from "next/font/google";
import { client } from "@/sanity/client";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import BackToTop from "./components/BackToTop";
import ScrollProgress from "./components/ScrollProgress";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-lora",
});

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
      </head>
      <body className={`min-h-full flex flex-col bg-white text-[#1A1815] ${plusJakarta.variable} ${lora.variable} font-sans`} suppressHydrationWarning>
        <SiteHeader categories={categories} />
        <div className="flex-1">{children}</div>
        <SiteFooter categories={categories} />
        <ScrollProgress />
        <BackToTop />
      </body>
    </html>
  );
}
