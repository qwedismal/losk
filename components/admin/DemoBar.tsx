"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { postJson } from "@/lib/client";
import { withCount } from "@/lib/format";

/**
 * Visible marker that the visitor is inside a demo, with the two actions that
 * matter while showing it to a prospect: reset the data and open the sales page.
 */
export function DemoBar({ requests }: { requests: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const reset = async () => {
    setBusy(true);
    const res = await postJson<{ requests: number }>("/api/demo/reset", {});
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2600);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line bg-canvas px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-accent-deep">
        <Icon name="eye" size={13} />
        Демо-режим
      </span>
      <span className="text-[11.5px] text-ink-soft">
        {withCount(requests, ["заявка", "заявки", "заявок"])} в примере
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void reset()}
          disabled={busy}
          className="flex h-8 items-center gap-1.5 rounded-full bg-canvas-soft px-3 text-[11.5px] font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          <Icon name={done ? "check" : "refresh"} size={13} />
          {done ? "Готово" : busy ? "Сбрасываем…" : "Сбросить данные"}
        </button>
        <Link
          href="/case"
          className="flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[11.5px] font-medium text-white"
        >
          Что получает владелец
          <Icon name="arrowUpRight" size={13} />
        </Link>
      </div>
    </div>
  );
}
