/**
 * Shown instantly while a page loads (Next.js loading.tsx), so clicking a tab
 * responds right away instead of waiting for the server.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

export function PageSkeleton({ cards = 4, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Bar className="h-7 w-48" />
          <Bar className="h-4 w-80 max-w-full" />
        </div>
        <Bar className="h-10 w-36" />
      </div>
      {cards > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <Bar className="h-4 w-28" />
              <Bar className="h-7 w-24" />
              <Bar className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <Bar className="h-3 w-1/3" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0">
            <Bar className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-3 w-1/2" />
            </div>
            <Bar className="hidden h-6 w-20 sm:block" />
            <Bar className="hidden h-8 w-24 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
