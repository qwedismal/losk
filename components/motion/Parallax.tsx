"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface ParallaxLayerProps {
  children: ReactNode;
  /** Total vertical travel in px (0–12 keeps it quiet). */
  distance?: number;
  /** Direction multiplier: 1 = layer trails the scroll, -1 = leads it. */
  direction?: 1 | -1;
  /** Hide the layer from assistive tech (decorative gradients, patterns). */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Slow scroll parallax on `transform` only.
 *
 * The offset is derived from the *parent's* rect, so moving the layer never
 * feeds back into its own measurement. rAF-throttled, passive listeners, reset
 * on unmount, and completely inactive under reduced motion.
 */
export function ParallaxLayer({
  children,
  distance = 12,
  direction = 1,
  decorative = true,
  className = "",
  style,
}: ParallaxLayerProps) {
  const reduced = useReducedMotion();
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const layer = layerRef.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = host.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = (viewport - rect.top) / (viewport + rect.height);
      const clamped = Math.min(1, Math.max(0, progress));
      const travel = (clamped - 0.5) * distance * direction;
      layer.style.transform = `translate3d(0, ${travel.toFixed(2)}px, 0)`;
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
      layer.style.transform = "";
    };
  }, [direction, distance, reduced]);

  return (
    <div ref={layerRef} aria-hidden={decorative || undefined} className={className} style={style}>
      {children}
    </div>
  );
}
