"use client";

import AdSlot from "./AdSlot";

interface AdSidebarProps {
  slotId: string;
  className?: string;
}

export default function AdSidebar({ slotId, className = "" }: AdSidebarProps) {
  return (
    <div
      className={`hidden lg:block rounded-xl border border-black/5 bg-gradient-to-br from-slate-50 to-white p-4 ${className}`}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#1A1815]/30">
        Iklan
      </p>
      <AdSlot
        slotId={slotId}
        className="flex items-center justify-center"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}
