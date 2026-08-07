"use client";

import { useEffect, useRef } from "react";
import { ADS_ENABLED, AD_PUBLISHER_ID } from "@/app/lib/ads";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdSlotProps {
  slotId: string;
  format?: "auto" | "fluid";
  className?: string;
  style?: React.CSSProperties;
}

export default function AdSlot({
  slotId,
  format = "auto",
  className = "",
  style,
}: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ADS_ENABLED || !ref.current) return;

    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {}
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!ADS_ENABLED) return null;

  return (
    <div
      ref={ref}
      className={`ad-container text-center ${className}`}
      style={style}
    >
      <ins
        className="adsbygoogle block"
        data-ad-client={AD_PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
        style={{ display: "block" }}
      />
    </div>
  );
}
