"use client";

/**
 * Before / after comparison.
 *
 * With owner-uploaded photos it is a plain image reveal. Without them it draws
 * the two states itself: one woven textile, rendered twice from the same
 * pattern / turbulence seeds, with stains multiplied into the "before" copy.
 * The two panels are stacked full-size and only the top one is clipped, which
 * is what keeps the weave lines perfectly registered across the divider.
 */

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from "react";
import { Icon } from "./icons";

export type CompareItem = "sofa" | "carpet" | "mattress" | "other";

export interface BeforeAfterSliderProps {
  item: CompareItem;
  /** Optional real photo pair; the procedural textile is used when either is missing. */
  beforeSrc?: string;
  afterSrc?: string;
  caption?: string;
  className?: string;
}

const ITEM_LABEL: Record<CompareItem, string> = {
  sofa: "Диван",
  carpet: "Ковёр",
  mattress: "Матрас",
  other: "Кресло",
};

/** Same fabric colours as the 3D objects, so the two sections share one palette. */
const FABRIC: Record<CompareItem, string> = {
  sofa: "#E7DECD",
  carpet: "#CFE3DE",
  mattress: "#F2EEE7",
  other: "#DFD9CE",
};

type StainTone = "brown" | "olive" | "umber";

const STAIN_COLOR: Record<StainTone, string> = {
  brown: "#6B4A28",
  olive: "#6A6A3A",
  umber: "#5A4433",
};

/** Fixed positions in the 800x500 drawing space; deliberately uneven. */
const STAINS: ReadonlyArray<{
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  tone: StainTone;
  opacity: number;
}> = [
  { cx: 172, cy: 322, rx: 98, ry: 70, rotate: -14, tone: "brown", opacity: 0.95 },
  { cx: 316, cy: 176, rx: 64, ry: 44, rotate: 22, tone: "olive", opacity: 0.78 },
  { cx: 436, cy: 364, rx: 80, ry: 50, rotate: 9, tone: "umber", opacity: 0.72 },
  { cx: 592, cy: 212, rx: 54, ry: 38, rotate: -20, tone: "brown", opacity: 0.6 },
];

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function TextilePanel({
  uid,
  scope,
  tone,
}: {
  uid: string;
  scope: "before" | "after";
  tone: string;
}): ReactElement {
  const id = (suffix: string) => `${uid}-${scope}-${suffix}`;
  const isBefore = scope === "before";

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* 9-unit cells land on ~5 CSS pixels in the rendered frame, which is the
            point where a flat fill starts reading as woven cloth. */}
        <pattern id={id("weave")} width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 2.6h9M0 7.4h9" stroke="#000000" strokeOpacity="0.1" strokeWidth="2.4" />
          <path d="M2.6 0v9M7.4 0v9" stroke="#000000" strokeOpacity="0.045" strokeWidth="2" />
          <path d="M0 4.8h9" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="1.2" />
        </pattern>

        {/* Fibre grain. The seed is identical in both panels so the noise lines up. */}
        <filter id={id("fibre")} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="11" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="lifted">
            <feFuncR type="linear" slope="0.34" intercept="0.83" />
            <feFuncG type="linear" slope="0.34" intercept="0.83" />
            <feFuncB type="linear" slope="0.34" intercept="0.83" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="lifted" mode="multiply" />
        </filter>

        {isBefore ? (
          <>
            {/* Tight pass: gives each blotch an irregular, soaked-in edge. */}
            <filter
              id={id("warp")}
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015 0.021"
                numOctaves="3"
                seed="5"
                result="wobble"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="wobble"
                scale="24"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feGaussianBlur stdDeviation="1.4" />
            </filter>
            {/* Wide pass: the halo where liquid wicked outward through the pile. */}
            <filter
              id={id("bleed")}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.011 0.016"
                numOctaves="2"
                seed="5"
                result="wobble"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="wobble"
                scale="46"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feGaussianBlur stdDeviation="10" />
            </filter>
            {Object.entries(STAIN_COLOR).map(([toneName, color]) => (
              <radialGradient key={toneName} id={id(`stain-${toneName}`)}>
                <stop offset="0%" stopColor={color} stopOpacity="0.7" />
                <stop offset="52%" stopColor={color} stopOpacity="0.3" />
                <stop offset="80%" stopColor={color} stopOpacity="0.46" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            ))}
          </>
        ) : (
          <linearGradient id={id("sheen")} x1="0" y1="0" x2="0.72" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="44%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        )}
      </defs>

      <rect width="800" height="500" fill={tone} />
      {isBefore ? <rect width="800" height="500" fill="#77684C" opacity="0.2" /> : null}
      <rect width="800" height="500" fill={tone} filter={`url(#${id("fibre")})`} />
      <rect width="800" height="500" fill={`url(#${id("weave")})`} />

      {isBefore ? (
        <>
          <g filter={`url(#${id("bleed")})`} opacity="0.55">
            {STAINS.map((stain) => (
              <ellipse
                key={`bleed-${stain.cx}-${stain.cy}`}
                cx={stain.cx}
                cy={stain.cy}
                rx={stain.rx * 1.05}
                ry={stain.ry * 1.05}
                transform={`rotate(${stain.rotate} ${stain.cx} ${stain.cy})`}
                fill={`url(#${id(`stain-${stain.tone}`)})`}
                opacity={stain.opacity}
              />
            ))}
          </g>
          <g filter={`url(#${id("warp")})`}>
            {STAINS.map((stain) => (
              <ellipse
                key={`${stain.cx}-${stain.cy}`}
                cx={stain.cx}
                cy={stain.cy}
                rx={stain.rx}
                ry={stain.ry}
                transform={`rotate(${stain.rotate} ${stain.cx} ${stain.cy})`}
                fill={`url(#${id(`stain-${stain.tone}`)})`}
                opacity={stain.opacity}
              />
            ))}
          </g>
          {/* Dull, slightly smoked cast over the whole "before" state. */}
          <rect width="800" height="500" fill="#3E362A" opacity="0.08" />
        </>
      ) : (
        <rect width="800" height="500" fill={`url(#${id("sheen")})`} />
      )}
    </svg>
  );
}

export function BeforeAfterSlider({
  item,
  beforeSrc,
  afterSrc,
  caption,
  className = "",
}: BeforeAfterSliderProps): ReactElement {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const uid = `ba${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const hasPhotos = Boolean(beforeSrc && afterSrc);
  const label = ITEM_LABEL[item];

  const moveTo = useCallback((clientX: number) => {
    const node = frame.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) return;
    setPosition(clampPercent(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    moveTo(event.clientX);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = position - step;
        break;
      case "ArrowRight":
        next = position + step;
        break;
      case "PageDown":
        next = position - 10;
        break;
      case "PageUp":
        next = position + 10;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    setPosition(clampPercent(next));
  };

  const revealClip = `inset(0 ${100 - position}% 0 0)`;

  return (
    <figure className={className}>
      <div
        ref={frame}
        className="relative aspect-[4/3] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-card border border-line bg-canvas-soft sm:aspect-[16/10]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {hasPhotos ? (
          <>
            <img
              src={afterSrc}
              alt={`${label} после химчистки`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0" style={{ clipPath: revealClip }}>
              <img
                src={beforeSrc}
                alt={`${label} до химчистки`}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </>
        ) : (
          <>
            <TextilePanel uid={uid} scope="after" tone={FABRIC[item]} />
            <div className="absolute inset-0" style={{ clipPath: revealClip }}>
              <TextilePanel uid={uid} scope="before" tone={FABRIC[item]} />
            </div>
          </>
        )}

        <span className="pill pointer-events-none absolute left-3 top-3 z-10 bg-white/85 text-ink shadow-soft backdrop-blur-sm">
          До
        </span>
        <span className="pill pointer-events-none absolute right-3 top-3 z-10 bg-white/85 text-ink shadow-soft backdrop-blur-sm">
          После
        </span>

        <div className="absolute inset-y-0 z-20 -translate-x-1/2" style={{ left: `${position}%` }}>
          <span
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/95 shadow-[0_0_14px_rgba(20,22,26,0.22)]"
          />
          <div
            role="slider"
            tabIndex={0}
            aria-label={`Сравнение: ${label.toLowerCase()} до и после химчистки`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-valuetext={`${Math.round(position)} из 100`}
            aria-orientation="horizontal"
            onKeyDown={handleKeyDown}
            className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white text-ink shadow-lift ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-deep"
          >
            <Icon name="chevronLeft" size={14} />
            <Icon name="chevronRight" size={14} />
          </div>
        </div>
      </div>

      {caption ? (
        <figcaption className="mt-3 text-[13px] leading-relaxed text-mute">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
