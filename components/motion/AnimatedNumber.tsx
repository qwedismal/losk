"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

export interface AnimatedNumberProps {
  value: number;
  /** Tween length, ms. */
  duration?: number;
  /** Turns an intermediate number into the rendered string (client components only). */
  format?: (value: number) => string;
  /** Prefix/suffix for the built-in formatter - serialisable, so server components can use it. */
  prefix?: string;
  suffix?: string;
  /** Decimals used by the built-in ru-RU formatter (ignored when `format` is given). */
  decimals?: number;
  /** Wait until the number is scrolled into view before counting (default `true`). */
  startOnView?: boolean;
  /** Extra delay before the tween starts, ms. */
  delay?: number;
  className?: string;
  /** What assistive tech announces instead of the tweening digits. */
  label?: string;
  style?: CSSProperties;
}

/** easeOutExpo - fast, then a long quiet settle. The house easing. */
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * rAF number tween.
 *
 * Layout-shift free: the final string is rendered once, invisibly, to reserve the
 * exact width, and the tweening digits are painted on top of it in a grid cell,
 * so the surrounding text never reflows while digits change. The visible digits
 * are `aria-hidden`; screen readers hear the final value exactly once.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  format,
  prefix = "",
  suffix = "",
  decimals = 0,
  startOnView = true,
  delay = 0,
  className = "",
  label,
  style,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();

  const defaultFormat = useCallback(
    (input: number) => {
      const rounded = decimals > 0 ? Number(input.toFixed(decimals)) : Math.round(input);
      const grouped = rounded.toLocaleString("ru-RU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${grouped}${suffix}`;
    },
    [decimals, prefix, suffix],
  );

  const formatValue = format ?? defaultFormat;
  const finalText = formatValue(value);

  // Server render and first client render agree on the final text (no mismatch).
  const [text, setText] = useState(finalText);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const valueRef = useRef(value);

  const [ref, inView] = useInView<HTMLSpanElement>({
    once: true,
    threshold: 0.4,
    skip: reduced,
  });

  useEffect(() => {
    if (valueRef.current !== value) {
      // A new number means a fresh run once it is (or becomes) visible.
      valueRef.current = value;
      startedRef.current = false;
      setText(finalText);
    }
  }, [value, finalText]);

  // The formatter is captured when the tween starts and deliberately left out of
  // the dependency list: an inline `format` identity would otherwise cancel a
  // running tween on its own state update.
  useEffect(() => {
    if (reduced) {
      setText(finalText);
      return;
    }
    if (startOnView && !inView) return;
    if (startedRef.current) return;

    startedRef.current = true;
    const length = Math.max(1, duration);
    const stopAt = value;
    const formatTick = formatValue;
    let cancelled = false;
    let startTime = 0;

    const step = (now: number) => {
      if (cancelled) return;
      if (startTime === 0) startTime = now;
      const progress = Math.min(1, (now - startTime) / length);
      setText(formatTick(stopAt * easeOutExpo(progress)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    const begin = () => {
      if (cancelled) return;
      setText(formatTick(0));
      frameRef.current = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timerRef.current = window.setTimeout(begin, delay);
    } else {
      begin();
    }

    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      frameRef.current = null;
      timerRef.current = null;
    };
  }, [delay, duration, inView, reduced, startOnView, value]);

  return (
    <span
      ref={ref}
      className={`inline-grid align-baseline ${className}`}
      style={{ gridTemplateAreas: '"n"', fontVariantNumeric: "tabular-nums", ...style }}
    >
      {/* Width reservation: the final string decides the box, so no CLS. */}
      <span aria-hidden className="invisible whitespace-nowrap" style={{ gridArea: "n" }}>
        {finalText}
      </span>
      {/* Same cell, stretched to the reserved width: only the glyphs move. */}
      <span aria-hidden className="whitespace-nowrap text-right" style={{ gridArea: "n" }}>
        {text}
      </span>
      <span className="sr-only">{label ?? finalText}</span>
    </span>
  );
}
