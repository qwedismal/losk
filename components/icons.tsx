/**
 * Soft-icons set - original duotone SVGs drawn on a 24px grid.
 *
 * House style:
 *  - 1.75px round-cap strokes for the line layer
 *  - a translucent (13–16%) filled "mass" behind it, which is what gives the
 *    family its soft, weightless feel
 *  - no gradients, no shadows: the softness comes from geometry, so icons read
 *    well at 16px and on any background
 *  - every glyph is optically balanced inside a 2px safe area
 */
import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "sofa"
  | "carpet"
  | "mattress"
  | "armchair"
  | "sparkle"
  | "drop"
  | "leaf"
  | "clock"
  | "calendar"
  | "phone"
  | "message"
  | "shield"
  | "check"
  | "checkCircle"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "arrowRight"
  | "arrowUpRight"
  | "plus"
  | "minus"
  | "star"
  | "photo"
  | "upload"
  | "trash"
  | "lock"
  | "user"
  | "dashboard"
  | "list"
  | "ruble"
  | "card"
  | "bell"
  | "bellOff"
  | "wifiOff"
  | "install"
  | "pin"
  | "van"
  | "spray"
  | "close"
  | "info"
  | "logout"
  | "refresh"
  | "link"
  | "eye";

type Glyph = { fill?: ReactNode; line: ReactNode };

const G: Record<IconName, Glyph> = {
  sofa: {
    fill: (
      <path d="M3 13.4c0-1 .8-1.9 1.9-1.9h14.2c1.1 0 1.9.9 1.9 1.9v3.7c0 1.6-1.3 2.9-2.9 2.9H5.9A2.9 2.9 0 0 1 3 17.1z" />
    ),
    line: (
      <>
        <path d="M4.7 11.2V8.6A2.6 2.6 0 0 1 7.3 6h9.4a2.6 2.6 0 0 1 2.6 2.6v2.6" />
        <path d="M3 13.4a1.9 1.9 0 0 1 1.9-1.9h14.2a1.9 1.9 0 0 1 1.9 1.9v3.7a2.9 2.9 0 0 1-2.9 2.9H5.9A2.9 2.9 0 0 1 3 17.1z" />
        <path d="M7 20v1.3M17 20v1.3" />
      </>
    ),
  },
  carpet: {
    fill: <path d="M12 4.1 20.6 8.3 12 12.5 3.4 8.3z" />,
    line: (
      <>
        <path d="M12 4.1 20.6 8.3 12 12.5 3.4 8.3z" />
        <path d="M3.4 8.3v7.1L12 19.7l8.6-4.3V8.3" />
        <path d="M7.6 10.6 5.9 9.7M16.4 10.6l1.7-.9" />
      </>
    ),
  },
  mattress: {
    fill: <rect x="2.6" y="7.6" width="18.8" height="10.4" rx="3.2" />,
    line: (
      <>
        <rect x="2.6" y="7.6" width="18.8" height="10.4" rx="3.2" />
        <path d="M6.4 13.9h.01M9.8 13.9h.01M13.2 13.9h.01M16.6 13.9h.01" />
      </>
    ),
  },
  armchair: {
    fill: (
      <path d="M4.6 12.7a1.9 1.9 0 0 1 3.8 0v1.8h7.2v-1.8a1.9 1.9 0 0 1 3.8 0v3.6a2.9 2.9 0 0 1-2.9 2.9H7.5a2.9 2.9 0 0 1-2.9-2.9z" />
    ),
    line: (
      <>
        <path d="M6.9 11.4V8.6A3.4 3.4 0 0 1 10.3 5.2h3.4a3.4 3.4 0 0 1 3.4 3.4v2.8" />
        <path d="M4.6 12.7a1.9 1.9 0 0 1 3.8 0v1.8h7.2v-1.8a1.9 1.9 0 0 1 3.8 0v3.6a2.9 2.9 0 0 1-2.9 2.9H7.5a2.9 2.9 0 0 1-2.9-2.9z" />
        <path d="M8 19.2v1.4M16 19.2v1.4" />
      </>
    ),
  },
  sparkle: {
    fill: (
      <path d="M12 3.2c.55 4.35 1.9 5.7 6.25 6.25-4.35.55-5.7 1.9-6.25 6.25-.55-4.35-1.9-5.7-6.25-6.25 4.35-.55 5.7-1.9 6.25-6.25z" />
    ),
    line: (
      <>
        <path d="M12 3.2c.55 4.35 1.9 5.7 6.25 6.25-4.35.55-5.7 1.9-6.25 6.25-.55-4.35-1.9-5.7-6.25-6.25 4.35-.55 5.7-1.9 6.25-6.25z" />
        <path d="M17.9 15.3c.24 1.9.82 2.48 2.72 2.72-1.9.24-2.48.82-2.72 2.72-.24-1.9-.82-2.48-2.72-2.72 1.9-.24 2.48-.82 2.72-2.72z" />
      </>
    ),
  },
  drop: {
    fill: <path d="M12 3.6c3.35 4.15 5.5 6.95 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.55 2.15-5.35 5.5-9.5z" />,
    line: (
      <>
        <path d="M12 3.6c3.35 4.15 5.5 6.95 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.55 2.15-5.35 5.5-9.5z" />
        <path d="M9.6 13.9a2.4 2.4 0 0 0 2.4 2.4" />
      </>
    ),
  },
  leaf: {
    fill: (
      <path d="M19.7 4.3C9.6 4.6 5 9.7 5 16.6c0 1.4.3 2.6.3 2.6s3.2-1.9 6.3-4.8c1.4-1.3 2.6-2.8 3.4-4.3" />
    ),
    line: (
      <>
        <path d="M19.7 4.3c-9.9.5-14.7 5.6-14.7 12.3 0 1.5.3 2.7.3 2.7" />
        <path d="M5.3 19.3C6.9 15.6 9.8 12.6 13.6 11" />
      </>
    ),
  },
  clock: {
    fill: <circle cx="12" cy="12" r="8.4" />,
    line: (
      <>
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 7.5V12l3.2 2" />
      </>
    ),
  },
  calendar: {
    fill: <rect x="3" y="5.6" width="18" height="14.6" rx="3.4" />,
    line: (
      <>
        <rect x="3" y="5.6" width="18" height="14.6" rx="3.4" />
        <path d="M3 10.2h18M7.8 3.4v3.2M16.2 3.4v3.2" />
      </>
    ),
  },
  phone: {
    fill: (
      <path d="M6.6 4.4h2.7l1.4 3.9-2 1.5a12.2 12.2 0 0 0 5.5 5.5l1.5-2 3.9 1.4v2.7a2.9 2.9 0 0 1-2.9 2.9C9.4 20.3 3.7 14.6 3.7 7.3a2.9 2.9 0 0 1 2.9-2.9z" />
    ),
    line: (
      <path d="M6.6 4.4h2.7l1.4 3.9-2 1.5a12.2 12.2 0 0 0 5.5 5.5l1.5-2 3.9 1.4v2.7a2.9 2.9 0 0 1-2.9 2.9C9.4 20.3 3.7 14.6 3.7 7.3a2.9 2.9 0 0 1 2.9-2.9z" />
    ),
  },
  message: {
    fill: (
      <path d="M12 4.6c4.5 0 8.1 3 8.1 6.8s-3.6 6.8-8.1 6.8c-.9 0-1.8-.1-2.6-.3L5 19.6l1.1-3.2A6.4 6.4 0 0 1 3.9 11.4c0-3.8 3.6-6.8 8.1-6.8z" />
    ),
    line: (
      <>
        <path d="M20.1 11.4c0 3.8-3.6 6.8-8.1 6.8-.9 0-1.8-.1-2.6-.3L5 19.6l1.1-3.2A6.4 6.4 0 0 1 3.9 11.4c0-3.8 3.6-6.8 8.1-6.8s8.1 3 8.1 6.8z" />
        <path d="M8.8 11.4h.01M12 11.4h.01M15.2 11.4h.01" />
      </>
    ),
  },
  shield: {
    fill: <path d="M12 3.3 19.5 6v5.3c0 4.5-3.1 7.8-7.5 9.5-4.4-1.7-7.5-5-7.5-9.5V6z" />,
    line: (
      <>
        <path d="M12 3.3 19.5 6v5.3c0 4.5-3.1 7.8-7.5 9.5-4.4-1.7-7.5-5-7.5-9.5V6z" />
        <path d="m9 11.9 2.1 2.1 4-4.2" />
      </>
    ),
  },
  check: { line: <path d="m5 12.6 4.5 4.5L19 6.7" /> },
  checkCircle: {
    fill: <circle cx="12" cy="12" r="8.6" />,
    line: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="m8.4 12.2 2.5 2.5 4.7-5" />
      </>
    ),
  },
  chevronRight: { line: <path d="m9.4 5.6 6.4 6.4-6.4 6.4" /> },
  chevronLeft: { line: <path d="m14.6 5.6-6.4 6.4 6.4 6.4" /> },
  chevronDown: { line: <path d="m5.6 9.4 6.4 6.4 6.4-6.4" /> },
  arrowRight: { line: <path d="M4.4 12h14.2M13 6.2 18.8 12 13 17.8" /> },
  arrowUpRight: { line: <path d="M7 17 17 7M8.6 7H17v8.4" /> },
  plus: { line: <path d="M12 5.4v13.2M5.4 12h13.2" /> },
  minus: { line: <path d="M5.4 12h13.2" /> },
  star: {
    fill: (
      <path d="m12 3.6 2.62 5.5 5.98.82-4.36 4.24 1.07 5.98L12 17.28l-5.31 2.86 1.07-5.98L3.4 9.92l5.98-.82z" />
    ),
    line: (
      <path d="m12 3.6 2.62 5.5 5.98.82-4.36 4.24 1.07 5.98L12 17.28l-5.31 2.86 1.07-5.98L3.4 9.92l5.98-.82z" />
    ),
  },
  photo: {
    fill: <rect x="3" y="4.6" width="18" height="14.8" rx="3.4" />,
    line: (
      <>
        <rect x="3" y="4.6" width="18" height="14.8" rx="3.4" />
        <path d="M3.4 15.4 8 11.2l3.4 3 2.6-2.4 5.6 5" />
        <circle cx="16.2" cy="9.2" r="1.5" />
      </>
    ),
  },
  upload: {
    fill: <path d="M12 4.4 17.2 9.6h-3.1v5.6h-4.2v-5.6H6.8z" />,
    line: (
      <>
        <path d="M12 15.6V5.2M7.6 9.4 12 5l4.4 4.4" />
        <path d="M4.6 15.8v2.4a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-2.4" />
      </>
    ),
  },
  trash: {
    line: (
      <>
        <path d="M4.8 7.3h14.4M9.6 7.3V5.7A1.4 1.4 0 0 1 11 4.3h2a1.4 1.4 0 0 1 1.4 1.4v1.6" />
        <path d="M6.6 7.3l.8 11.1a2.4 2.4 0 0 0 2.4 2.2h4.4a2.4 2.4 0 0 0 2.4-2.2l.8-11.1" />
        <path d="M10.4 10.8v6.2M13.6 10.8v6.2" />
      </>
    ),
  },
  lock: {
    fill: <rect x="4.4" y="10" width="15.2" height="10.2" rx="3" />,
    line: (
      <>
        <rect x="4.4" y="10" width="15.2" height="10.2" rx="3" />
        <path d="M8 10V7.8a4 4 0 0 1 8 0V10" />
        <path d="M12 14v2.4" />
      </>
    ),
  },
  user: {
    fill: <circle cx="12" cy="8.2" r="3.9" />,
    line: (
      <>
        <circle cx="12" cy="8.2" r="3.7" />
        <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
      </>
    ),
  },
  dashboard: {
    fill: <rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2.2" />,
    line: (
      <>
        <rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2.2" />
        <rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2.2" />
      </>
    ),
  },
  list: {
    line: (
      <>
        <path d="M8.8 6.6h10.6M8.8 12h10.6M8.8 17.4h10.6" />
        <path d="M4.8 6.6h.01M4.8 12h.01M4.8 17.4h.01" />
      </>
    ),
  },
  ruble: {
    line: <path d="M8.4 20.4V4.2h4.2a4.4 4.4 0 0 1 0 8.8H6.6M14 16.8H6.6" />,
  },
  card: {
    fill: <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="3.2" />,
    line: (
      <>
        <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="3.2" />
        <path d="M2.8 10h18.4M6.4 14.6h3.2" />
      </>
    ),
  },
  bell: {
    fill: <path d="M18 9.6c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4z" />,
    line: (
      <>
        <path d="M18 9.6c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 5-2 6.4-2 6.4h16s-2-1.4-2-6.4z" />
        <path d="M10.1 19.2a2.2 2.2 0 0 0 3.8 0" />
      </>
    ),
  },
  bellOff: {
    line: (
      <>
        <path d="M8.4 5.4A6 6 0 0 1 18 9.6c0 2.4.5 4 1 5" />
        <path d="M6.4 7.6a6 6 0 0 0-.4 2c0 5-2 6.4-2 6.4h10.6" />
        <path d="M10.1 19.2a2.2 2.2 0 0 0 3.8 0M3.4 3.4l17.2 17.2" />
      </>
    ),
  },
  wifiOff: {
    line: (
      <>
        <path d="M2.8 8.4a14 14 0 0 1 5.2-3.1M14 4.6a14 14 0 0 1 7.2 3.8M5.8 12a10 10 0 0 1 3-1.7M15.2 10.3a10 10 0 0 1 2.9 1.7M9 15.4a5.4 5.4 0 0 1 6 .3" />
        <path d="M12 19.4h.01M3.4 3.4l17.2 17.2" />
      </>
    ),
  },
  install: {
    fill: <path d="M12 4.4 17.2 9.6h-3.1v5.6h-4.2v-5.6H6.8z" />,
    line: (
      <>
        <path d="M12 4.4v9.4M7.6 9.4 12 13.8l4.4-4.4" />
        <path d="M4.6 16.2v2a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-2" />
      </>
    ),
  },
  pin: {
    fill: <path d="M12 21.2s7-5.7 7-11.4A7 7 0 0 0 5 9.8c0 5.7 7 11.4 7 11.4z" />,
    line: (
      <>
        <path d="M12 21.2s7-5.7 7-11.4A7 7 0 0 0 5 9.8c0 5.7 7 11.4 7 11.4z" />
        <circle cx="12" cy="9.6" r="2.6" />
      </>
    ),
  },
  van: {
    fill: <path d="M2.6 8.4a1.8 1.8 0 0 1 1.8-1.8h7.2v9.6H2.6z" />,
    line: (
      <>
        <path d="M2.6 16.2V8.4a1.8 1.8 0 0 1 1.8-1.8h7.2v9.6" />
        <path d="M11.6 9.8h3.9l3.9 3.2v3.2" />
        <circle cx="7.2" cy="17.8" r="2" />
        <circle cx="16.8" cy="17.8" r="2" />
        <path d="M2.6 16.2h2.6M9.2 16.2h5.6M18.8 16.2h2.6v-3.2" />
      </>
    ),
  },
  spray: {
    fill: <rect x="7.4" y="8.6" width="9.2" height="11.6" rx="2.8" />,
    line: (
      <>
        <rect x="7.4" y="8.6" width="9.2" height="11.6" rx="2.8" />
        <path d="M10.4 8.6V6.4h3.2v2.2M12 4.2v2.2" />
        <path d="M18.4 6.6h.01M20.4 9.2h.01M18.4 11.8h.01" />
      </>
    ),
  },
  close: { line: <path d="M6 6l12 12M18 6 6 18" /> },
  info: {
    line: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        <path d="M12 11v5.2M12 7.9h.01" />
      </>
    ),
  },
  logout: {
    line: (
      <>
        <path d="M14.6 4.8h2.2a2.4 2.4 0 0 1 2.4 2.4v9.6a2.4 2.4 0 0 1-2.4 2.4h-2.2" />
        <path d="M10 8.4 13.6 12 10 15.6M13.6 12H3.8" />
      </>
    ),
  },
  refresh: {
    line: (
      <>
        <path d="M20.3 12a8.3 8.3 0 1 1-2.4-5.9" />
        <path d="M20.6 4.2v4.9h-4.9" />
      </>
    ),
  },
  link: {
    line: (
      <>
        <path d="M9.6 14.4 14.4 9.6" />
        <path d="M11.4 7.2 12.8 5.8a3.9 3.9 0 0 1 5.5 5.5l-1.4 1.4M12.6 16.8l-1.4 1.4a3.9 3.9 0 0 1-5.5-5.5l1.4-1.4" />
      </>
    ),
  },
  eye: {
    fill: <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z" />,
    line: (
      <>
        <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** "duotone" (default) shows the soft mass; "line" is stroke-only */
  variant?: "duotone" | "line";
  title?: string;
}

export function Icon({ name, size = 24, variant = "duotone", title, className, ...rest }: IconProps) {
  const glyph = G[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {variant === "duotone" && glyph.fill ? (
        <g fill="currentColor" stroke="none" opacity="0.14">
          {glyph.fill}
        </g>
      ) : null}
      <g fill="none">{glyph.line}</g>
    </svg>
  );
}

/** Round, tinted plate that holds a soft icon - the house container. */
export function IconPlate({
  name,
  size = 22,
  tone = "accent",
  className = "",
}: {
  name: IconName;
  size?: number;
  tone?: "accent" | "ink" | "sand" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: "bg-accent-mist text-accent-deep",
    ink: "bg-ink text-white",
    sand: "bg-sand text-ink",
    muted: "bg-canvas-soft text-ink-soft",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[18px] ${tones[tone]} ${className}`}
      style={{ width: size + 22, height: size + 22 }}
    >
      <Icon name={name} size={size} />
    </span>
  );
}

export const ITEM_ICONS: Record<"sofa" | "carpet" | "mattress" | "other", IconName> = {
  sofa: "sofa",
  carpet: "carpet",
  mattress: "mattress",
  other: "armchair",
};
