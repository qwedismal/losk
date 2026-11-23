import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/site/Nav";

/** Slim header for the /case sales page. Hidden on paper. */
export function CaseHeader() {
  return (
    <header className="border-b border-line bg-canvas print:hidden">
      <div className="page flex min-h-16 items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
          <Logo />
          <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden font-mono text-[11px] tracking-[0.01em] text-mute sm:inline">
            демо-проект
          </span>
        </div>

        <nav aria-label="Страница кейса" className="flex items-center gap-1.5">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
          >
            Открыть демо
            <Icon name="arrowUpRight" size={14} className="text-mute" />
          </Link>
          <Link
            href="/case/print"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#22252b]"
          >
            <Icon name="list" size={15} />
            PDF<span className="hidden sm:inline"> · A4</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
