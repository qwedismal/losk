"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "./icons";
import { SplitText } from "./motion/SplitText";
import { Reveal } from "./motion/Reveal";

/* ---------------------------------------------------------------------------
   Button
   --------------------------------------------------------------------------- */

type Variant = "primary" | "accent" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // The 1px inner top highlight is what keeps a flat dark pill from reading as
  // a printed rectangle.
  primary:
    "bg-ink text-white hover:bg-[#22252b] active:bg-[#0b0d10] shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_10px_30px_-12px_rgba(20,22,26,.55)]",
  accent:
    "bg-accent-deep text-white hover:bg-[#055a52] active:bg-[#04453f] shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_12px_30px_-12px_rgba(6,114,104,.65)]",
  soft: "bg-canvas-soft text-ink hover:bg-line-soft border border-line",
  ghost: "bg-transparent text-ink hover:bg-canvas-soft",
  danger: "bg-danger text-white hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-full",
  md: "h-11 px-5 text-[15px] gap-2 rounded-full",
  lg: "h-13 px-7 text-[16px] gap-2.5 rounded-full",
};

const BUTTON_BASE =
  "group inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep";

/** The right icon slides a hair toward the edge on hover - direction, not bounce. */
function IconRight({ name, size }: { name: IconName; size: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex transition-transform duration-200 ease-[var(--ease-out-soft)] group-hover:translate-x-0.5"
    >
      <Icon name={name} size={size} />
    </span>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    iconRight,
    loading,
    block,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-[1.75px] border-current border-t-transparent"
        />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 16 : 18} />
      ) : null}
      {children}
      {iconRight && !loading ? <IconRight name={iconRight} size={size === "sm" ? 16 : 18} /> : null}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  block,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} /> : null}
      {children}
      {iconRight ? <IconRight name={iconRight} size={size === "sm" ? 16 : 18} /> : null}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   Form fields
   --------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  icon,
  className = "",
  suffix,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  suffix?: ReactNode;
}) {
  const id = rest.id || rest.name;
  const tone = error
    ? "border-danger/60 focus-within:border-danger focus-within:shadow-[0_0_0_4px_rgba(200,68,59,0.10)]"
    : "border-line focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(15,182,166,0.12)]";
  return (
    <label htmlFor={id} className={`group block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-soft transition-colors duration-200 group-focus-within:text-ink">
          {label}
        </span>
        {hint ? <span className="text-[12px] text-mute">{hint}</span> : null}
      </span>
      <span
        className={`flex items-center gap-2.5 rounded-[var(--radius-field)] border bg-canvas px-4 transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out-soft)] ${tone}`}
      >
        {icon ? <Icon name={icon} size={18} className="shrink-0 text-mute" /> : null}
        <input
          id={id}
          className="h-12 w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-mute/70"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {suffix}
      </span>
      {error ? (
        <span id={`${id}-error`} role="alert" className="mt-1.5 block text-[12.5px] font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = rest.id || rest.name;
  const tone = error
    ? "border-danger/60 focus-within:border-danger focus-within:shadow-[0_0_0_4px_rgba(200,68,59,0.10)]"
    : "border-line focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(15,182,166,0.12)]";
  return (
    <label htmlFor={id} className={`group block ${className}`}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-soft transition-colors duration-200 group-focus-within:text-ink">
          {label}
        </span>
        {hint ? <span className="text-[12px] text-mute">{hint}</span> : null}
      </span>
      <span
        className={`block rounded-[var(--radius-field)] border bg-canvas px-4 py-3 transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out-soft)] ${tone}`}
      >
        <textarea
          id={id}
          rows={3}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-mute/70"
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </span>
      {error ? (
        <span role="alert" className="mt-1.5 block text-[12.5px] font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function ConsentCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-ink-soft">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[7px] border transition-all ${
            checked ? "border-accent bg-accent text-white" : error ? "border-danger" : "border-line bg-canvas"
          }`}
        >
          {checked ? <Icon name="check" size={13} strokeWidth={2.6} /> : null}
        </span>
        <span>
          Согласен с{" "}
          <Link
            href="/privacy"
            className="text-ink underline decoration-line underline-offset-2 hover:decoration-accent"
          >
            политикой обработки данных
          </Link>{" "}
          и{" "}
          <Link
            href="/offer"
            className="text-ink underline decoration-line underline-offset-2 hover:decoration-accent"
          >
            офертой
          </Link>
          .
        </span>
      </label>
      {error ? (
        <span role="alert" className="mt-1.5 block pl-8 text-[12.5px] font-medium text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Layout helpers
   --------------------------------------------------------------------------- */

export function Eyebrow({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "mute" }) {
  // Sentence case, normal tracking: wide-tracked uppercase labels are the
  // generic "AI landing page" eyebrow. This reads as editorial, not as a template.
  return (
    <span className={`text-[13.5px] font-medium ${tone === "accent" ? "text-accent-deep" : "text-mute"}`}>
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
  className = "",
  titleBreakAfter,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Forced line break after N words on ≥sm screens (string titles only). */
  titleBreakAfter?: number;
}) {
  const plain = typeof title === "string" ? title : null;
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow ? (
        <Reveal as="span" y={8} duration={520} className="inline-block">
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      ) : null}
      {plain ? (
        <SplitText
          as="h2"
          text={plain}
          breakAfter={titleBreakAfter}
          delay={60}
          stagger={38}
          className="mt-2.5 text-[clamp(26px,5.4vw,44px)] font-semibold text-ink"
        />
      ) : (
        <Reveal as="div" y={16} delay={60}>
          <h2 className="mt-2.5 text-[clamp(26px,5.4vw,44px)] font-semibold text-ink">{title}</h2>
        </Reveal>
      )}
      {sub ? (
        <Reveal
          as="p"
          y={10}
          delay={210}
          duration={640}
          className={`mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-[17px] ${
            align === "center" ? "mx-auto max-w-[52ch]" : "max-w-[58ch]"
          }`}
        >
          {sub}
        </Reveal>
      ) : null}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-line ${className}`} />;
}

/** Scroll-triggered reveal - one implementation, owned by `components/motion`. */
export { Reveal } from "./motion/Reveal";
export type { RevealProps } from "./motion/Reveal";

/* ---------------------------------------------------------------------------
   Status pill
   --------------------------------------------------------------------------- */

const STATUS_LABEL: Record<string, { label: string; short: string; className: string }> = {
  new: { label: "Новая", short: "Новая", className: "bg-accent-mist text-accent-deep" },
  contacted: { label: "Связались", short: "Связались", className: "bg-canvas-soft text-ink-soft" },
  quote_sent: { label: "Смета отправлена", short: "Смета", className: "bg-sand text-warn" },
  confirmed: { label: "Подтверждена", short: "Мастер", className: "bg-accent-soft text-accent-deep" },
  done: { label: "Работа выполнена", short: "Готово", className: "bg-accent-soft text-accent-deep" },
  awaiting_payment: { label: "Ждёт оплаты", short: "Ждёт", className: "bg-sand text-warn" },
  paid: { label: "Оплачена", short: "Оплачена", className: "bg-[#e7f5ee] text-ok" },
  closed: { label: "Закрыта", short: "Закрыта", className: "bg-canvas-soft text-mute" },
  cancelled: { label: "Отменена", short: "Отмена", className: "bg-[#fbeceb] text-danger" },
};

export function StatusPill({
  status,
  className = "",
  compact = false,
}: {
  status: string;
  className?: string;
  /** short label for dense list rows on phones */
  compact?: boolean;
}) {
  const cfg = STATUS_LABEL[status] ?? {
    label: status,
    short: status,
    className: "bg-canvas-soft text-ink-soft",
  };
  return (
    <span className={`pill whitespace-nowrap ${cfg.className} ${className}`}>
      {compact ? cfg.short : cfg.label}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Toast
   --------------------------------------------------------------------------- */

export function useToast() {
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4200);
    return () => clearTimeout(t);
  }, [message]);
  const node = message ? (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm animate-pop items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-[14px] font-medium text-white shadow-lift"
    >
      <Icon name={message.tone === "ok" ? "checkCircle" : "info"} size={18} className="shrink-0" />
      {message.text}
    </div>
  ) : null;
  return { toast: setMessage, toastNode: node };
}

/** Formatting helpers shared by UI (mirror of lib/pricing, but client-safe). */
export function rub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} ₽`;
}
