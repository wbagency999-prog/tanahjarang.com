import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/client";
import { writeClient } from "@/sanity/writeClient";

// GET — ambil komentar yang sudah disetujui
export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  try {
    const comments = await client.fetch(
      `*[_type == "comment" && post._ref == $postId && approved == true] | order(createdAt desc){
        _id,
        name,
        comment,
        createdAt
      }`,
      { postId }
    );
    return NextResponse.json(comments);
  } catch (err) {
    console.error("Gagal ambil komentar:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — kirim komentar baru (pending approval)
export async function POST(req: NextRequest) {
  try {
    const { postId, name, email, comment, website } = await req.json();

    // Honeypot anti-spam: bots fill hidden fields, humans don't
    if (website) {
      return NextResponse.json({ success: true, id: 'honeypot' });
    }

    if (!postId || !name?.trim() || !comment?.trim()) {
      return NextResponse.json({ error: "postId, name, dan comment wajib diisi" }, { status: 400 });
    }

    const result = await writeClient.create({
      _type: "comment",
      post: { _ref: postId, _type: "reference" },
      name: name.trim(),
      email: email?.trim() || undefined,
      comment: comment.trim(),
      approved: false,
    });

    return NextResponse.json({ success: true, id: result._id });
  } catch (err) {
    console.error("Gagal kirim komentar:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
