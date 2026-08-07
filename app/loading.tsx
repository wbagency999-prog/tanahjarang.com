export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Breaking skeleton */}
      <div className="mb-6 h-10 animate-pulse rounded bg-[#1A1815]/5" />

      {/* Hero skeleton */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="aspect-[16/9] animate-pulse rounded-lg bg-[#1A1815]/5" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-full animate-pulse rounded bg-[#1A1815]/5" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-[#1A1815]/5" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-[#1A1815]/5" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-24 w-32 shrink-0 animate-pulse rounded bg-[#1A1815]/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-[#1A1815]/5" />
                <div className="h-5 w-full animate-pulse rounded bg-[#1A1815]/5" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#1A1815]/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3 rounded-md border border-black/5 p-3">
              <span className="text-2xl font-black text-[#1A1815]/10">{i + 1}</span>
              <div className="flex-1 space-y-1">
                <div className="h-4 w-full animate-pulse rounded bg-[#1A1815]/5" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#1A1815]/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
