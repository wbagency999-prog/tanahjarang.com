"use client";

import { useState, useEffect } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  caption?: string;
}

export default function ImageLightbox({
  src,
  alt,
  width,
  height,
  className = "",
  caption,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <figure className="my-6">
        <button
          onClick={() => setOpen(true)}
          className="block w-full cursor-zoom-in"
          aria-label={`Perbesar gambar: ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={`w-full rounded object-cover transition-transform hover:scale-[1.01] ${className}`}
          />
        </button>
        {caption && (
          <figcaption className="mt-2 text-center text-xs text-[#1A1815]/50 italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Lightbox overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white hover:bg-white/30"
            aria-label="Tutup"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-full rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {caption && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/80">
              {caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
