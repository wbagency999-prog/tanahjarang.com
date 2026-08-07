"use client";

import { useState, useEffect } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setProgress(pct);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress < 1) return null;

  return (
    <div className="fixed top-0 left-0 z-50 h-1 w-full">
      <div
        className="h-full bg-[#CC181F] transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
