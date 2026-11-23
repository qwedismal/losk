"use client";

import { createElement, type CSSProperties, type ReactNode } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

export type RevealTag = "div" | "section" | "article" | "li" | "span" | "figure" | "header" | "p";

export interface RevealProps {
  children: ReactNode;
  /** Delay before the transition starts, ms. */
  delay?: number;
  /** Vertical offset while hidden, px. */
  y?: number;
  /** Optional blur while hidden, px (0 = off). */
  blur?: number;
  /** Scale while hidden (1 = off). */
  scale?: number;
  /** Transition duration, ms. */
  duration?: number;
  /** Re-hide when the element leaves the viewport (default: reveal once). */
  once?: boolean;
  as?: RevealTag;
  className?: string;
  style?: CSSProperties;
}

/**
 * Scroll reveal: opacity + transform + optional blur.
 *
 * Only composite-friendly properties are animated and the hidden state lives in
 * inline styles, so no global CSS cascade is involved. Reduced-motion users get
 * the visible state immediately - no observer, no transition.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  blur = 0,
  scale = 1,
  duration = 700,
  once = true,
  as = "div",
  className = "",
  style,
}: RevealProps) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ once, skip: reduced });
  const visible = reduced || inView;

  const transition = [
    `opacity ${duration}ms var(--ease-out-soft) ${delay}ms`,
    `transform ${duration}ms var(--ease-out-soft) ${delay}ms`,
    blur > 0 ? `filter ${duration}ms var(--ease-out-soft) ${delay}ms` : "",
  ]
    .filter(Boolean)
    .join(", ");

  return createElement(
    as,
    {
      ref,
      className,
      style: {
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : `translate3d(0, ${y}px, 0)${scale === 1 ? "" : ` scale(${scale})`}`,
        filter: visible || blur === 0 ? "none" : `blur(${blur}px)`,
        transition,
        willChange: visible ? "auto" : "opacity, transform",
      } satisfies CSSProperties,
    },
    children,
  );
}
