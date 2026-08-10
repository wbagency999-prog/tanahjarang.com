interface Crumb {
  name: string;
  href?: string;
}

export default function Breadcrumb({
  items,
  light,
}: {
  items: Crumb[];
  light?: boolean;
}) {
  const baseUrl = process.env.SITE_URL || "https://tanahjarang.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-sm ${light ? "text-white/50" : "text-[#1A1815]/60"}`}>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {item.href ? (
              <a href={item.href} className={light ? "hover:text-white/80" : "hover:text-[#CC181F]"}>{item.name}</a>
            ) : (
              <span className={`max-w-xs truncate ${light ? "text-white/35" : "text-[#1A1815]/40"}`} aria-current="page">{item.name}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}