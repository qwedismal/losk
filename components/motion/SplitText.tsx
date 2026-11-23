"use client";

import { Fragment, createElement, type CSSProperties } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

export type SplitTextTag = "span" | "div" | "h1" | "h2" | "h3" | "p";

export interface SplitTextProps {
  /** The whole sentence - used verbatim for `aria-label`. */
  text: string;
  as?: SplitTextTag;
  /** Time between two words, ms. */
  stagger?: number;
  /** Delay before the first word, ms. */
  delay?: number;
  /** Per-word transition length, ms. */
  duration?: number;
  /** Optional per-word blur while hidden, px. */
  blur?: number;
  /** Insert a desktop-only line break after this many words. */
  breakAfter?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Word-by-word heading reveal.
 *
 * Accessibility: the parent carries `aria-label={text}` while every visual word
 * span is `aria-hidden`, so assistive tech reads the sentence exactly once, in
 * order. The words are real text nodes in the document (crawlable, selectable).
 */
export function SplitText({
  text,
  as = "span",
  stagger = 40,
  delay = 0,
  duration = 760,
  blur = 0,
  breakAfter,
  className = "",
  style,
}: SplitTextProps) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ once: true, skip: reduced });
  const visible = reduced || inView;
  const words = text.split(/\s+/).filter(Boolean);

  return createElement(
    as,
    { ref, className, style, "aria-label": text },
    words.map((word, index) => (
      <Fragment key={`${word}-${index}`}>
        <span
          aria-hidden
          className="inline-block"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translate3d(0, 0.34em, 0)",
            filter: visible || blur === 0 ? "none" : `blur(${blur}px)`,
            transition: [
              `opacity ${duration}ms var(--ease-out-soft) ${delay + index * stagger}ms`,
              `transform ${duration}ms var(--ease-out-soft) ${delay + index * stagger}ms`,
              blur > 0 ? `filter ${duration}ms var(--ease-out-soft) ${delay + index * stagger}ms` : "",
            ]
              .filter(Boolean)
              .join(", "),
            willChange: visible ? "auto" : "opacity, transform",
          }}
        >
          {word}
        </span>
        {index < words.length - 1 ? " " : null}
        {breakAfter === index + 1 && index < words.length - 1 ? (
          <br className="hidden sm:block" aria-hidden />
        ) : null}
      </Fragment>
    )),
  );
}

/** Alias kept for the brief's "SplitText or StaggerText" wording. */
export const StaggerText = SplitText;
