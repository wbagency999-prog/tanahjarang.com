import type { Metadata } from "next";
import PageRenderer from "../components/PageRenderer";

export const metadata: Metadata = {
  title: "Kebijakan DMCA | Warta Nusantara",
  description: "Kebijakan DMCA Warta Nusantara — prosedur pelaporan pelanggaran hak cipta.",
};

export default function DMCAPolicy() {
  return <PageRenderer slug="dmca" breadcrumbName="Kebijakan DMCA" />;
}
