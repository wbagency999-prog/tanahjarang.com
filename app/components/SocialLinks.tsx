interface SocialLinksProps {
  variant?: "header" | "footer";
}

// Social media URLs — update these when accounts are configured
const SOCIAL_URLS: Record<string, string> = {
  instagram: "#",
  twitter: "#",
  youtube: "#",
  tiktok: "#",
};

export default function SocialLinks({ variant = "header" }: SocialLinksProps) {
  const allLinks = [
    { name: "Instagram", key: "instagram", icon: "📷" },
    { name: "Twitter/X", key: "twitter", icon: "𝕏" },
    { name: "YouTube", key: "youtube", icon: "▶" },
    { name: "TikTok", key: "tiktok", icon: "♪" },
  ];

  // Only show links with configured URLs
  const links = allLinks.filter((l) => SOCIAL_URLS[l.key]);

  if (links.length === 0) return null;

  if (variant === "footer") {
    return (
      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Ikuti Kami</h4>
        <ul className="flex gap-3">
          {links.map((link) => (
            <li key={link.name}>
              <a
                href={SOCIAL_URLS[link.key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.name}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-sm hover:border-[#CC181F] hover:text-[#CC181F] transition-colors"
              >
                {link.icon}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-2">
      {links.map((link) => (
        <a
          key={link.name}
          href={SOCIAL_URLS[link.key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.name}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-xs hover:border-[#CC181F] hover:text-[#CC181F] transition-colors"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
