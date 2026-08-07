interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  function getPageUrl(page: number) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}page=${page}`;
  }

  // Generate page numbers with ellipsis
  function getPageNumbers(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const pages = getPageNumbers();

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {/* Prev */}
      {currentPage > 1 ? (
        <a
          href={getPageUrl(currentPage - 1)}
          className="flex h-9 items-center gap-1 rounded-lg border border-black/10 px-3 text-sm font-medium text-[#1A1815]/70 hover:border-[#CC181F] hover:text-[#CC181F] transition-colors"
        >
          <span>‹</span>
          <span className="hidden sm:inline">Prev</span>
        </a>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-lg border border-black/5 px-3 text-sm text-[#1A1815]/30">
          <span>‹</span>
          <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      {/* Page Numbers */}
      {pages.map((page, i) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-[#1A1815]/40">
              ⋯
            </span>
          );
        }
        const isActive = page === currentPage;
        return (
          <a
            key={page}
            href={getPageUrl(page)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-[#CC181F] text-white shadow-md"
                : "border border-black/10 text-[#1A1815]/70 hover:border-[#CC181F] hover:text-[#CC181F]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </a>
        );
      })}

      {/* Next */}
      {currentPage < totalPages ? (
        <a
          href={getPageUrl(currentPage + 1)}
          className="flex h-9 items-center gap-1 rounded-lg border border-black/10 px-3 text-sm font-medium text-[#1A1815]/70 hover:border-[#CC181F] hover:text-[#CC181F] transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <span>›</span>
        </a>
      ) : (
        <span className="flex h-9 items-center gap-1 rounded-lg border border-black/5 px-3 text-sm text-[#1A1815]/30">
          <span className="hidden sm:inline">Next</span>
          <span>›</span>
        </span>
      )}
    </nav>
  );
}
