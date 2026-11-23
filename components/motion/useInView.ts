"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseInViewOptions {
  /** IntersectionObserver root margin. Default trims the bottom 8% of the viewport. */
  rootMargin?: string;
  /** 0–1 (array thresholds are intentionally not supported - they break effect identity). */
  threshold?: number;
  /** Stop observing after the first intersection (default `true`). */
  once?: boolean;
  /** Skip the observer and report `true` immediately (e.g. reduced motion). */
  skip?: boolean;
}

/**
 * IntersectionObserver in a hook.
 *
 * Returns `[ref, inView]` and never touches `window` during render, so it is
 * safe to call in SSR-rendered client components.
 */
export function useInView<T extends HTMLElement = HTMLElement>({
  rootMargin = "0px 0px -8% 0px",
  threshold = 0,
  once = true,
  skip = false,
}: UseInViewOptions = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (skip) {
      setInView(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold, skip]);

  return [ref, inView];
}
