import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/sanity/writeClient";

const NEW_CATEGORIES = [
  { title: "Teknologi", slug: "teknologi", description: "AI, startup, gadget, blockchain, software" },
  { title: "Olahraga", slug: "olahraga", description: "Liga, Piala, Timnas, MotoGP, F1" },
  { title: "Pertambangan", slug: "pertambangan", description: "Tambang, mineral, energi, HMA" },
  { title: "Bisnis", slug: "bisnis", description: "Berita bisnis, ekonomi, dan finansial" },
];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const secret = process.env.PIPELINE_SECRET
  if (!body.secret || !secret || body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  for (const cat of NEW_CATEGORIES) {
    // Cek apakah sudah ada
    const existing = await writeClient.fetch(
      `*[_type == "category" && slug.current == $slug][0]._id`,
      { slug: cat.slug }
    );

    if (existing) {
      results.push(`${cat.title} — sudah ada`);
    } else {
      await writeClient.create({
        _type: "category",
        title: cat.title,
        slug: { _type: "slug", current: cat.slug },
        description: cat.description,
      });
      results.push(`${cat.title} — dibuat baru ✓`);
    }
  }

  return NextResponse.json({ results });
}
