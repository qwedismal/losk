"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/icons";

/**
 * Segment error boundary. Names what happened and what to do next instead of
 * showing a bare "Something went wrong" (R-27), and keeps the retry in reach.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this is where a Sentry/logger hook would go.
    console.error("route error", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-[22px] bg-canvas-soft text-ink-soft">
        <Icon name="refresh" size={26} />
      </span>
      <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">Страница не открылась</h1>
      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-ink-soft">
        Похоже, запрос не дошёл до сервера. Данные заявки при этом не потеряны: попробуйте обновить страницу,
        а если ошибка повторяется, позвоните нам.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white transition-transform active:scale-[.98]"
        >
          <Icon name="refresh" size={16} />
          Попробовать снова
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-line px-5 text-[14px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft"
        >
          На главную
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-4 font-mono text-[11px] text-mute">код ошибки: {error.digest}</p>
      ) : null}
    </main>
  );
}
