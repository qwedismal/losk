"use client";

import type { ReactNode } from "react";

export interface PressableScaleProps {
  children: ReactNode;
  className?: string;
}

/**
 * Press feedback without JavaScript: `:active` scales the wrapper to 0.97.
 * Keyboard activation does not need it (no pointer is down). The wrapper is a
 * plain inline-flex box, so it drops into buttons and links without changing
 * their layout.
 */
export function PressableScale({ children, className = "" }: PressableScaleProps) {
  return (
    <span
      className={`inline-flex transition-transform duration-150 ease-[var(--ease-out-soft)] active:scale-[0.97] ${className}`}
    >
      {children}
    </span>
  );
}
