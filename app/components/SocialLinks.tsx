interface SocialLinksProps {
  variant?: "header" | "footer";
}

export default function SocialLinks({ variant = "header" }: SocialLinksProps) {
  const links = [
    { name: "Instagram", href: "#", icon: "📷" },
    { name: "Twitter/X", href: "#", icon: "𝕏" },
    { name: "YouTube", href: "#", icon: "▶" },
    { name: "TikTok", href: "#", icon: "♪" },
  ];

  if (variant === "footer") {
    return (
      <div>
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Ikuti Kami</h4>
        <ul className="flex gap-3">
          {links.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
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
          href={link.href}
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
