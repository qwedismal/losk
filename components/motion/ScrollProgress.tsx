"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface ScrollProgressProps {
  /** Hairline thickness, px. */
  height?: number;
  className?: string;
}

/**
 * 2px reading-progress hairline pinned to the top of the viewport.
 *
 * Scroll-driven (rAF-throttled, passive listener) and composited: only
 * `transform: scaleX()` changes, so nothing lays out. Disabled entirely for
 * reduced-motion users - there is no loop to run.
 */
export function ScrollProgress({ height = 2, className = "" }: ScrollProgressProps) {
  const reduced = useReducedMotion();
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      if (!bar) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.transform = `scaleX(${progress})`;
      bar.style.opacity = progress > 0.001 ? "1" : "0";
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] ${className}`}
      style={{ height }}
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-accent"
        style={{ transform: "scaleX(0)", opacity: 0, transition: "opacity 200ms linear" }}
      />
    </div>
  );
}
