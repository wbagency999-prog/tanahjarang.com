"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Cari" className="text-lg">
        🔍
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative mx-auto mt-0 max-w-3xl px-4 pt-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Mencari..."
                className="flex-1 rounded-md border-2 border-[#CC181F] bg-white px-4 py-3 text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CC181F] text-lg text-white hover:opacity-90"
              >
                ×
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
