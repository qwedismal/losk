"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { postJson } from "@/lib/client";

/**
 * One-click demo entry. Only rendered when the server has DEMO_MODE on, and the
 * API route itself refuses to work otherwise - hiding the button is a
 * convenience, not the security boundary.
 */
export function DemoLoginButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = async () => {
    setBusy(true);
    setError(null);
    const res = await postJson<{ redirect: string }>("/api/demo/login", {});
    setBusy(false);
    if (!res.ok || !res.data?.redirect) {
      setError(res.data?.error || "Не удалось открыть демо");
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-medium tracking-[0.01em] text-mute">или</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => void enter()}
        disabled={busy}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-canvas text-[14.5px] font-medium text-ink transition-all active:scale-[.985] hover:bg-canvas-soft disabled:opacity-60"
      >
        <Icon name={busy ? "clock" : "eye"} size={17} className="text-accent-deep" />
        {busy ? "Открываем демо…" : "Открыть демо-кабинет"}
      </button>

      <p className="mt-2 text-center text-[11px] leading-snug text-mute">
        Демо-доступ: полный кабинет с заявками, сметами и оплатой. Данные можно сбросить в один клик.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-[#fbeceb] px-3 py-2 text-[12px] font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
