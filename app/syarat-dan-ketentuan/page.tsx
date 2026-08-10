import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan | Warta Nusantara",
  description: "Syarat dan ketentuan penggunaan website Warta Nusantara.",
};

export default function SyaratDanKetentuan() {
  return <PageRenderer slug="syarat-dan-ketentuan" breadcrumbName="Syarat dan Ketentuan" />;
}
