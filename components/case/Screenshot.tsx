import type { CaseShot } from "@/lib/case";

type Frame = "desktop" | "phone" | "plain";

/**
 * Screenshot plate. Width/height are always set, and the inner box carries an
 * aspect-ratio, so the image never shifts layout while loading.
 */
export function Screenshot({
  shot,
  frame = "plain",
  crop = false,
  eager = false,
  className = "",
}: {
  shot: CaseShot;
  frame?: Frame;
  /** Tight frame for tall phone screenshots; keeps the document grid even. */
  crop?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src={shot.src}
      width={shot.width}
      height={shot.height}
      alt={shot.alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
      className={crop ? "h-full w-full object-cover object-top" : "block h-auto w-full"}
    />
  );

  return (
    <figure className={className}>
      {frame === "desktop" ? (
        <div className="overflow-hidden rounded-[18px] border border-line bg-canvas shadow-soft">
          <div
            aria-hidden
            className="flex items-center gap-2 border-b border-line bg-canvas-soft px-3 py-2.5"
          >
            <span className="flex gap-1">
              <span className="size-2 rounded-full bg-line" />
              <span className="size-2 rounded-full bg-line" />
              <span className="size-2 rounded-full bg-line" />
            </span>
            <span className="ml-1 truncate font-mono text-[10px] tracking-[0.01em] text-mute">
              демо · главная
            </span>
          </div>
          <div style={{ aspectRatio: `${shot.width} / ${shot.height}` }}>{img}</div>
        </div>
      ) : frame === "phone" ? (
        <div className="mx-auto w-full max-w-[320px] rounded-[30px] border border-line bg-ink p-1.5 shadow-soft sm:max-w-[360px] lg:max-w-[380px]">
          <div
            className={`overflow-hidden rounded-[24px] bg-canvas ${crop ? "aspect-[4/5]" : ""}`}
            style={crop ? undefined : { aspectRatio: `${shot.width} / ${shot.height}` }}
          >
            {img}
          </div>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-[14px] border border-line bg-canvas-soft ${crop ? "aspect-[4/5]" : ""}`}
          style={crop ? undefined : { aspectRatio: `${shot.width} / ${shot.height}` }}
        >
          {img}
        </div>
      )}

      <figcaption className="mt-3">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13.5px] font-medium text-ink">{shot.caption}</span>
          {crop || shot.cropped ? (
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[10px] tracking-[0.01em] text-mute">
              фрагмент
            </span>
          ) : null}
        </span>
        <span className="mt-1 block max-w-[42ch] text-[12px] leading-snug text-mute">{shot.note}</span>
      </figcaption>
    </figure>
  );
}
