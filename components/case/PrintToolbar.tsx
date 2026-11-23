"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

/** Screen-only toolbar. Every control here is hidden by the print stylesheet. */
export function PrintToolbar() {
  return (
    <div className="print-toolbar mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-2.5">
      <Link
        href="/case"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 text-[13px] font-medium text-ink transition-colors hover:bg-canvas-soft"
      >
        <Icon name="chevronLeft" size={15} className="text-mute" />К странице кейса
      </Link>

      <div className="flex items-center gap-2.5">
        <span className="hidden font-mono text-[10.5px] tracking-[0.01em] text-mute sm:inline">
          A4 · один лист
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#22252b]"
        >
          <Icon name="list" size={15} />
          Печать или PDF
        </button>
      </div>
    </div>
  );
}
