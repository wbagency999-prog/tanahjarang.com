import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Tentang Kami | Warta Nusantara",
  description: "Mengenal lebih dekat Warta Nusantara — portal berita Indonesia terkini, terpercaya, dan informatif.",
};

export default function TentangKami() {
  return <PageRenderer slug="tentang-kami" breadcrumbName="Tentang Kami" />;
}
