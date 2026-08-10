import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Pernyataan Penggunaan AI | Warta Nusantara",
  description: "Pernyataan transparansi penggunaan kecerdasan buatan (AI) di Warta Nusantara.",
};

export default function AIDisclaimer() {
  return <PageRenderer slug="ai-disclaimer" breadcrumbName="Pernyataan Penggunaan AI" />;
}
