import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Kebijakan Editorial | Warta Nusantara",
  description: "Kebijakan editorial Warta Nusantara — standar penulisan, verifikasi fakta, dan etika jurnalistik.",
};

export default function EditorialPolicy() {
  return <PageRenderer slug="editorial-policy" breadcrumbName="Kebijakan Editorial" />;
}
