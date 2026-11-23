"use client";

import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "./useReducedMotion";

export interface MagneticProps {
  children: ReactNode;
  /** Max offset in px at the edge of the target (4–6px stays subtle). */
  strength?: number;
  className?: string;
  childrenClassName?: string;
  style?: CSSProperties;
}

/**
 * Pointer-follow micro-offset.
 *
 * The outer box never moves (so the hover target stays put); the inner box
 * shifts by at most `strength` px and springs back on leave. Mouse only;
 * touch pointers and reduced-motion users get a plain wrapper with no handlers.
 */
export function Magnetic({
  children,
  strength = 5,
  className = "",
  childrenClassName = "",
  style,
}: MagneticProps) {
  const reduced = useReducedMotion();
  const outerRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (reduced || event.pointerType !== "mouse") return;
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      const rect = outer.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dx = ((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * strength;
      const dy = ((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * strength;
      const clamp = (value: number) => Math.max(-strength, Math.min(strength, value));

      inner.style.transition = "transform 120ms linear";
      inner.style.transform = `translate3d(${clamp(dx).toFixed(2)}px, ${clamp(dy).toFixed(2)}px, 0)`;
    },
    [reduced, strength],
  );

  const onPointerLeave = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.style.transition = "transform 420ms var(--ease-spring)";
    inner.style.transform = "translate3d(0, 0, 0)";
  }, []);

  if (reduced) {
    return (
      <span className={`inline-flex ${className}`} style={style}>
        {children}
      </span>
    );
  }

  return (
    <span
      ref={outerRef}
      className={`inline-flex ${className}`}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      <span ref={innerRef} className={`inline-flex will-change-transform ${childrenClassName}`}>
        {children}
      </span>
    </span>
  );
}
