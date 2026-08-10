import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | Warta Nusantara",
  description: "Kebijakan privasi website Warta Nusantara — bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.",
};

export default function KebijakanPrivasi() {
  return <PageRenderer slug="kebijakan-privasi" breadcrumbName="Kebijakan Privasi" />;
}
