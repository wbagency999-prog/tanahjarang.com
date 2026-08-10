import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Hubungi Kami | Warta Nusantara",
  description: "Hubungi tim Warta Nusantara untuk pertanyaan, saran, atau kerja sama.",
};

export default function HubungiKami() {
  return <PageRenderer slug="hubungi-kami" breadcrumbName="Hubungi Kami" />;
}
