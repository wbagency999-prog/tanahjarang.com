import ArticleDetail, { getArticleMetadata } from "../../components/ArticleDetail";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return getArticleMetadata(slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  return <ArticleDetail slug={slug} />;
}