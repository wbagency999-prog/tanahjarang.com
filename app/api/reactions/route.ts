import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/sanity/writeClient";

const VALID_TYPES = ["like", "dislike", "funny", "angry"] as const;

export async function POST(req: NextRequest) {
  try {
    const { postId, type } = await req.json();

    if (!postId || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Cari reaction document untuk post ini
    const existing = await writeClient.fetch(
      `*[_type == "reaction" && post._ref == $postId][0]{ _id }`,
      { postId }
    );

    let result;
    if (existing) {
      // Update existing reaction
      result = await writeClient
        .patch(existing._id)
        .setIfMissing({ [type]: 0 })
        .inc({ [type]: 1 })
        .commit();
    } else {
      // Create new reaction document
      result = await writeClient.create({
        _type: "reaction",
        post: { _ref: postId, _type: "reference" },
        like: type === "like" ? 1 : 0,
        dislike: type === "dislike" ? 1 : 0,
        funny: type === "funny" ? 1 : 0,
        angry: type === "angry" ? 1 : 0,
      });
    }

    // Ambil counts terbaru
    const doc = await writeClient.getDocument(
      existing?._id ?? result._id
    );

    return NextResponse.json({
      like: doc?.like ?? 0,
      dislike: doc?.dislike ?? 0,
      funny: doc?.funny ?? 0,
      angry: doc?.angry ?? 0,
    });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
