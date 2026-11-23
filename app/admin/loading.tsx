/**
 * Loading state for the owner cabinet. Server components arrive fast on a local
 * network and slowly over 4G; without this the list area is blank and the page
 * jumps when data lands.
 */
export default function AdminLoading() {
  return (
    <div className="page pt-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загружаем заявки</span>

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="h-6 w-28 animate-pulse rounded-md bg-canvas-soft" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded-md bg-canvas-soft" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-full bg-canvas-soft" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-line bg-canvas" />
        ))}
      </div>

      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-canvas-soft" />
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-[18px] border border-line bg-canvas p-3 sm:p-3.5"
          >
            <div className="size-10 animate-pulse rounded-xl bg-canvas-soft" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 animate-pulse rounded bg-canvas-soft" />
              <div className="h-2.5 w-48 animate-pulse rounded bg-canvas-soft" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-canvas-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
