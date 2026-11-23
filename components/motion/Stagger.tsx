"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

export interface StaggerProps {
  children: ReactNode;
  /** Time between two children, ms. */
  step?: number;
  /** Delay before the first child, ms. */
  delay?: number;
  /** Vertical offset while hidden, px. */
  y?: number;
  /** Per-child transition length, ms. */
  duration?: number;
  className?: string;
  itemClassName?: string;
  style?: CSSProperties;
}

/**
 * Reveals its direct children one after another from a single observer.
 * Handy for icon rows (rating stars) and chips; each child keeps its own
 * layout, only opacity/transform animate.
 */
export function Stagger({
  children,
  step = 40,
  delay = 0,
  y = 6,
  duration = 420,
  className = "",
  itemClassName = "",
  style,
}: StaggerProps) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLSpanElement>({ once: true, skip: reduced });
  const visible = reduced || inView;
  const items = Children.toArray(children);

  return (
    <span ref={ref} className={className} style={style}>
      {items.map((child, index) => (
        <span
          key={index}
          className={`inline-flex ${itemClassName}`}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : `translate3d(0, ${y}px, 0)`,
            transition: [
              `opacity ${duration}ms var(--ease-out-soft) ${delay + index * step}ms`,
              `transform ${duration}ms var(--ease-out-soft) ${delay + index * step}ms`,
            ].join(", "),
            willChange: visible ? "auto" : "opacity, transform",
          }}
        >
          {child}
        </span>
      ))}
    </span>
  );
}
