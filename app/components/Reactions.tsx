"use client";

import { useState } from "react";

interface ReactionCounts {
  like: number;
  dislike: number;
  funny: number;
  angry: number;
}

interface ReactionsProps {
  postId: string;
  initialCounts: ReactionCounts;
}

const REACTIONS = [
  { key: "like" as const, emoji: "👍", label: "Like" },
  { key: "dislike" as const, emoji: "👎", label: "Dislike" },
  { key: "funny" as const, emoji: "😂", label: "Funny" },
  { key: "angry" as const, emoji: "😠", label: "Angry" },
] as const;

export default function Reactions({ postId, initialCounts }: ReactionsProps) {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [reacted, setReacted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReact(type: string) {
    if (loading || reacted === type) return;
    setLoading(true);

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      });

      if (res.ok) {
        const data = await res.json();
        setCounts(data);
        setReacted(type);
      }
    } catch (err) {
      console.error("Reaction failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-black/10 bg-[#1A1815]/[.02] p-5">
      <h3 className="mb-4 text-center text-base font-bold">Bagaimana reaksimu?</h3>
      <ul className="flex items-center justify-center gap-4">
        {REACTIONS.map(({ key, emoji, label }) => (
          <li key={key}>
            <button
              onClick={() => handleReact(key)}
              disabled={loading}
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 transition-all ${
                reacted === key
                  ? "border-[#CC181F] bg-[#CC181F]/10 scale-105"
                  : "border-black/10 hover:border-[#CC181F]/50 hover:bg-black/[.03]"
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-semibold text-[#1A1815]/70">{counts[key]}</span>
              <span className="text-[10px] text-[#1A1815]/50">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
