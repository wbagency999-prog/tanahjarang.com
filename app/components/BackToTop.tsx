"use client";

import { useState, useEffect } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setProgress(pct);
      setVisible(scrollTop > 400);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-2">
      {/* Progress ring */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Kembali ke atas"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:scale-110 dark:bg-[#1A1815] dark:text-white"
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2" />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="#CC181F"
            strokeWidth="2"
            strokeDasharray={`${progress} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative text-lg">↑</span>
      </button>
    </div>
  );
}
