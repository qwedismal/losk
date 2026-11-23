"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { BRAND } from "@/lib/brand";
import { ScrollProgress, PressableScale } from "@/components/motion";

type NavLink = { href: string; label: string; section: string | null };

const LINKS: NavLink[] = [
  { href: "/#calculator", label: "Калькулятор", section: "calculator" },
  { href: "/#how", label: "Как работаем", section: "how" },
  { href: "/#prices", label: "Цены", section: "prices" },
  { href: "/#results", label: "До / после", section: "results" },
  { href: "/chistka-mebeli-na-domu", label: "Услуги", section: null },
  { href: "/#faq", label: "Вопросы", section: "faq" },
];

/** Sections the scroll-spy watches, paired with their nav index. */
const WATCH = LINKS.map((link, index) => ({ id: link.section, index })).filter(
  (entry): entry is { id: string; index: number } => entry.id !== null,
);

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Лоск: на главную" className="group inline-flex items-center gap-2.5">
      <span className="relative flex size-8 items-center justify-center rounded-[11px] bg-ink text-white transition-transform duration-300 group-hover:-rotate-6">
        <Icon name="drop" size={17} variant="line" strokeWidth={2} />
        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent" />
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[-0.03em]">
          Лоск<span className="text-accent">.</span>
        </span>
      )}
    </Link>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  /* --- compact bar on scroll ------------------------------------------------ */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* --- body scroll lock + Escape while the sheet is open -------------------- */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  /* --- scroll-spy ---------------------------------------------------------- */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const targets = WATCH.map((entry) => ({ ...entry, el: document.getElementById(entry.id) })).filter(
      (entry): entry is { id: string; index: number; el: HTMLElement } => entry.el !== null,
    );
    if (targets.length === 0) return;

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = targets.find((candidate) => candidate.el === entry.target);
          if (!target) continue;
          // Any overlap counts; the band is thin, so the largest wins.
          ratios.set(target.index, entry.isIntersecting ? Math.max(entry.intersectionRatio, 0.0001) : 0);
        }

        let best = -1;
        let bestRatio = 0;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            best = index;
            bestRatio = ratio;
          }
        });
        setActiveIndex(best);
      },
      // A 10%-tall band across the middle of the viewport: the section that
      // crosses the reader's eye line is the current one.
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.0001, 0.01, 0.08] },
    );

    targets.forEach((target) => observer.observe(target.el));
    return () => observer.disconnect();
  }, []);

  /* --- measure the sliding underline --------------------------------------- */
  const measure = useCallback(() => {
    const link = linkRefs.current[activeIndex];
    const nav = navRef.current;
    if (!link || !nav || activeIndex < 0 || link.offsetWidth === 0) {
      setUnderline(null);
      return;
    }
    setUnderline({ left: link.offsetLeft, width: link.offsetWidth });
  }, [activeIndex]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <>
      <ScrollProgress />

      {/* Spacer: the header is fixed, so the document keeps a stable 56/64px top box. */}
      <div aria-hidden className="h-14 shrink-0 sm:h-16" />

      <header className="fixed inset-x-0 top-0 z-40">
        <div
          className={`relative transition-[height,background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] ${
            scrolled
              ? "h-13 border-b border-line bg-canvas/85 shadow-[0_1px_0_rgba(20,22,26,.04),0_18px_40px_-32px_rgba(20,22,26,.5)] backdrop-blur-xl sm:h-14"
              : "h-14 border-b border-transparent bg-canvas sm:h-16"
          }`}
        >
          <div className="page flex h-full items-center justify-between gap-4">
            <div
              className="origin-left transition-transform duration-300 ease-[var(--ease-out-soft)]"
              style={{ transform: scrolled ? "scale(0.94)" : "none" }}
            >
              <Logo />
            </div>

            <nav
              ref={navRef}
              aria-label="Основная навигация"
              className="relative hidden items-center gap-0.5 lg:flex"
            >
              {LINKS.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  ref={(node) => {
                    linkRefs.current[index] = node;
                  }}
                  aria-current={activeIndex === index ? "location" : undefined}
                  className={`rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors duration-200 hover:bg-canvas-soft hover:text-ink ${
                    activeIndex === index ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* 1px wide and scaled on X: one composited transform, no width animation. */}
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-accent"
                style={{
                  width: 1,
                  transform: `translateX(${underline?.left ?? 0}px) scaleX(${underline?.width ?? 0})`,
                  transformOrigin: "left center",
                  opacity: underline ? 1 : 0,
                  transition: "transform 320ms var(--ease-out-soft), opacity 200ms linear",
                }}
              />
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={BRAND.phoneHref}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-canvas-soft sm:flex"
              >
                <Icon name="phone" size={15} className="text-accent-deep" />
                {BRAND.phoneDisplay}
              </a>
              <Link
                href="/#calculator"
                className="hidden h-9 items-center rounded-full bg-ink px-4 text-[13px] font-medium text-white transition-[background-color,scale] duration-200 hover:bg-[#22252b] active:scale-[0.98] sm:flex"
              >
                Рассчитать
              </Link>
              <a
                href={BRAND.phoneHref}
                aria-label={`Позвонить ${BRAND.phoneDisplay}`}
                className="flex size-9 items-center justify-center rounded-full bg-canvas-soft text-ink sm:hidden"
              >
                <Icon name="phone" size={17} />
              </a>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? "Закрыть меню" : "Открыть меню"}
                className="flex size-9 items-center justify-center rounded-full bg-canvas-soft text-ink transition-transform duration-200 active:scale-[0.96] lg:hidden"
              >
                <Icon name={open ? "close" : "list"} size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrim under the open sheet: dims the page and catches taps, so the
            content peeking below the panel reads as "behind the menu" instead of
            looking like a clipped button. */}
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="absolute inset-x-0 top-full h-[100dvh] lg:hidden"
          style={{
            // Flat scrim: the sheet covers the top part, so a gradient top stop
            // would be hidden and only the faded bottom would remain visible.
            background: "rgba(20, 22, 26, 0.28)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity 240ms linear",
          }}
        />

        {/* Mobile sheet: grid-rows 0fr → 1fr is a height-free CSS trick that
            animates without measuring anything. */}
        <div
          id="mobile-menu"
          inert={!open}
          className="absolute inset-x-0 top-full grid overflow-hidden border-b border-line bg-canvas shadow-[0_24px_40px_-32px_rgba(20,22,26,.4)] lg:hidden"
          style={{
            gridTemplateRows: open ? "1fr" : "0fr",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "grid-template-rows 340ms var(--ease-out-soft), opacity 220ms linear",
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <nav aria-label="Мобильная навигация" className="page flex flex-col py-2">
              {LINKS.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-line-soft py-3.5 text-[15px] font-medium last:border-0"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? "none" : "translate3d(0, -6px, 0)",
                    transition: `opacity 260ms var(--ease-out-soft) ${
                      open ? 70 + index * 40 : 0
                    }ms, transform 260ms var(--ease-out-soft) ${open ? 70 + index * 40 : 0}ms`,
                  }}
                >
                  {link.label}
                  <Icon name="chevronRight" size={16} className="text-mute" />
                </Link>
              ))}
              <a
                href={BRAND.phoneHref}
                className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-white"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "none" : "translate3d(0, -6px, 0)",
                  transition: `opacity 260ms var(--ease-out-soft) ${
                    open ? 70 + LINKS.length * 40 : 0
                  }ms, transform 260ms var(--ease-out-soft) ${open ? 70 + LINKS.length * 40 : 0}ms`,
                }}
              >
                <Icon name="phone" size={16} />
                {BRAND.phoneDisplay}
              </a>
              <p className="mt-3 pb-2 text-center text-[12px] text-mute">{BRAND.hours}</p>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export function StickyCta() {
  const [scrolledPast, setScrolledPast] = useState(false);
  const [calculatorInView, setCalculatorInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The bar steps aside while the calculator form is on screen.
  useEffect(() => {
    const form = document.getElementById("calculator");
    if (!form || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setCalculatorInView(entry.isIntersecting);
      },
      { rootMargin: "-12% 0px -12% 0px", threshold: 0.12 },
    );

    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  const shown = scrolledPast && !calculatorInView;

  return (
    <div
      inert={!shown}
      aria-hidden={!shown}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl sm:hidden"
      style={{
        transform: shown ? "translateY(0)" : "translateY(112%)",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        transition: "transform 480ms var(--ease-spring), opacity 240ms linear",
      }}
    >
      <div className="flex items-center gap-2">
        <PressableScale className="shrink-0">
          <a
            href={BRAND.phoneHref}
            aria-label="Позвонить"
            className="flex size-11 items-center justify-center rounded-full border border-line bg-canvas text-ink"
          >
            <Icon name="phone" size={18} />
          </a>
        </PressableScale>
        <Link
          href="/#calculator"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[14.5px] font-medium text-white transition-transform duration-150 ease-[var(--ease-out-soft)] active:scale-[0.99]"
        >
          Рассчитать за минуту
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </div>
  );
}
