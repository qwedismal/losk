"use client";

/**
 * Motion primitives for Лоск.
 *
 * House rules baked into every export:
 * - only `transform` / `opacity` / `filter` / colour are animated (no layout);
 * - `prefers-reduced-motion: reduce` shows the final state immediately and
 *   starts no rAF loop;
 * - SSR-safe: hooks never read `window` during render, so server and first
 *   client render always match.
 */

export { useReducedMotion, prefersReducedMotion } from "./useReducedMotion";
export { useInView, type UseInViewOptions } from "./useInView";
export { Reveal, type RevealProps, type RevealTag } from "./Reveal";
export { AnimatedNumber, type AnimatedNumberProps } from "./AnimatedNumber";
export { ScrollProgress, type ScrollProgressProps } from "./ScrollProgress";
export { Magnetic, type MagneticProps } from "./Magnetic";
export { SplitText, StaggerText, type SplitTextProps, type SplitTextTag } from "./SplitText";
export { Stagger, type StaggerProps } from "./Stagger";
export { PressableScale, type PressableScaleProps } from "./PressableScale";
export { SmoothAccordion, type SmoothAccordionItem, type SmoothAccordionProps } from "./SmoothAccordion";
export { ParallaxLayer, type ParallaxLayerProps } from "./Parallax";
