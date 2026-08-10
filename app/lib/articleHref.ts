interface PostForLink {
  slug: { current: string } | null;
  categories?: { slug?: { current: string } }[];
}

export function articleHref(post: PostForLink): string {
  if (!post.slug?.current) return "#";
  const categorySlug = post.categories?.[0]?.slug?.current;
  return categorySlug ? `/${categorySlug}/${post.slug.current}` : `/berita/${post.slug.current}`;
}
