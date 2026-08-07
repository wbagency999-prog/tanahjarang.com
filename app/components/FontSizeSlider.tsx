"use client";

import { useState } from "react";

export default function FontSizeSlider() {
  const [size, setSize] = useState(100);

  function handleChange(value: number) {
    setSize(value);
    // Set CSS custom property pada article element
    const article = document.querySelector("article");
    if (article) {
      article.style.setProperty("--font-scale", `${value / 100}`);
    }
  }

  return (
    <div className="my-4 flex items-center justify-center gap-3 rounded-md border border-black/10 bg-[#1A1815]/[.02] px-4 py-3">
      <span className="text-xs text-[#1A1815]/50">A</span>
      <input
        type="range"
        min={80}
        max={140}
        step={5}
        value={size}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-40 accent-[#CC181F]"
        aria-label="Ukuran font"
      />
      <span className="text-lg font-bold text-[#1A1815]/50">A</span>
      <span className="ml-2 text-xs text-[#1A1815]/40">{size}%</span>
    </div>
  );
}
