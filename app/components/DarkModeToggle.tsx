"use client";

import { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mode terang" : "Mode gelap"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
      title={dark ? "Mode terang" : "Mode gelap"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
