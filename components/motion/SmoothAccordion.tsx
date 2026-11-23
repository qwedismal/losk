"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { useReducedMotion } from "./useReducedMotion";

export interface SmoothAccordionItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export interface SmoothAccordionProps {
  items: SmoothAccordionItem[];
  /** Container classes (borders, radius, dividers). */
  className?: string;
  /** Classes applied to every row. */
  itemClassName?: string;
  /** Row id opened on first paint (no id = all closed). */
  defaultOpenId?: string | null;
  /** Height animation length, ms. */
  duration?: number;
  idPrefix?: string;
}

/**
 * FAQ accordion with a measured height transition.
 *
 * - one row open at a time, so the page never "explodes" downwards;
 * - `button[aria-expanded][aria-controls]` + `role="region"` + `inert` on the
 *   collapsed panel (keyboard and screen-reader safe);
 * - height is written imperatively from the measured `scrollHeight`, so content
 *   can be any height and stay crisp; collapsed panels are `inert` and 0px tall,
 *   which means the closed state never contributes layout before hydration;
 * - reduced motion sets the final height instantly, with zero animation.
 */
export function SmoothAccordion({
  items,
  className = "",
  itemClassName = "",
  defaultOpenId = null,
  duration = 260,
  idPrefix = "faq",
}: SmoothAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const triggers = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]"),
    );
    if (triggers.length === 0) return;
    const index = triggers.findIndex((node) => node === event.target);
    if (index === -1) return;

    event.preventDefault();
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % triggers.length
        : (index - 1 + triggers.length) % triggers.length;
    triggers[next]?.focus();
  };

  return (
    <div className={`divide-y divide-line ${className}`} onKeyDown={handleKeyDown}>
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
          duration={duration}
          panelId={`${idPrefix}-panel-${item.id}`}
          triggerId={`${idPrefix}-trigger-${item.id}`}
          itemClassName={itemClassName}
        />
      ))}
    </div>
  );
}

function AccordionRow({
  item,
  open,
  onToggle,
  duration,
  panelId,
  triggerId,
  itemClassName,
}: {
  item: SmoothAccordionItem;
  open: boolean;
  onToggle: () => void;
  duration: number;
  panelId: string;
  triggerId: string;
  itemClassName: string;
}) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const settle = (isOpen: boolean) => {
      panel.style.height = isOpen ? "auto" : "0px";
      panel.style.opacity = isOpen ? "1" : "0";
    };

    if (reduced) {
      settle(open);
      return;
    }

    if (!mountedRef.current) {
      // First paint: jump to the real state instead of animating on load.
      mountedRef.current = true;
      settle(open);
      return;
    }

    let frame = 0;
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "height") return;
      if (open) panel.style.height = "auto";
    };

    panel.addEventListener("transitionend", onTransitionEnd);

    if (open) {
      panel.style.height = "0px";
      panel.style.opacity = "1";
      frame = requestAnimationFrame(() => {
        panel.style.height = `${panel.scrollHeight}px`;
      });
    } else {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.style.opacity = "0";
      frame = requestAnimationFrame(() => {
        panel.style.height = "0px";
      });
    }

    return () => {
      panel.removeEventListener("transitionend", onTransitionEnd);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [open, reduced]);

  return (
    <div className={itemClassName}>
      <h3>
        <button
          type="button"
          id={triggerId}
          data-accordion-trigger
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-left text-[14.5px] font-medium leading-snug"
        >
          <span className="text-pretty">{item.question}</span>
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-ink-soft"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: `transform ${duration}ms var(--ease-out-soft)`,
            }}
          >
            <Icon name="chevronDown" size={14} />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        ref={panelRef}
        role="region"
        aria-labelledby={triggerId}
        inert={!open}
        className="overflow-hidden"
        style={{
          height: 0,
          opacity: 0,
          transition: `height ${duration}ms var(--ease-out-soft), opacity ${Math.round(
            duration * 0.75,
          )}ms linear`,
        }}
      >
        <div className="pb-4 pr-8 text-[13px] leading-relaxed text-ink-soft">{item.answer}</div>
      </div>
    </div>
  );
}
