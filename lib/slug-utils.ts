export function cleanSlug(title: string): string {
  let slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Strip date patterns: "news-12-agustus-2026", "12-agustus-2026", "senin-12-agustus-2026"
  slug = slug.replace(/-?(senin|selasa|rabu|kamis|jumat|sabtu|minggu)?-?\d{1,2}-?(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)-?\d{4}-?$/gi, '');
  // Strip trailing "news-"
  slug = slug.replace(/-news-?$/gi, '');

  return slug.substring(0, 100);
}
