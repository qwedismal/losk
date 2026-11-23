import type { ReactNode } from "react";
import { Divider, SectionHead } from "@/components/ui";

/**
 * Editorial section frame: a mono index + label in a sticky left rail and the
 * shared SectionHead in the content column. Keeps every /case section on the
 * same vertical rhythm without duplicating the ui primitives.
 */
export function CaseSection({
  id,
  index,
  rail,
  eyebrow,
  title,
  sub,
  tone = "canvas",
  children,
}: {
  id: string;
  index: string;
  rail: string;
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  tone?: "canvas" | "soft";
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`border-t border-line ${tone === "soft" ? "bg-canvas-soft" : "bg-canvas"}`}
    >
      <div className="page py-12 sm:py-16 lg:py-20">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,190px)_minmax(0,1fr)] lg:gap-14">
          <div className="flex items-center gap-3 lg:sticky lg:top-6 lg:block lg:self-start">
            <span aria-hidden className="font-mono text-[13px] font-medium text-accent-deep">
              {index}
            </span>
            <span aria-hidden className="h-3 w-px bg-line lg:hidden" />
            <span className="font-mono text-[10.5px] leading-relaxed tracking-[0.01em] text-mute lg:mt-2 lg:block">
              {rail}
            </span>
            <Divider className="mt-4 hidden w-12 lg:block" />
          </div>

          <div>
            <SectionHead eyebrow={eyebrow} title={<span id={titleId}>{title}</span>} sub={sub} />
            <div className="mt-8 sm:mt-10">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
