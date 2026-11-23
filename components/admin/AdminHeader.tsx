"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { postJson } from "@/lib/client";
import { subscribeToPush } from "@/components/PwaProvider";

export function AdminHeader({ ownerSubs }: { ownerSubs: number }) {
  const router = useRouter();
  const [pushState, setPushState] = useState<"idle" | "busy" | "on" | "denied">("idle");

  const enablePush = async () => {
    setPushState("busy");
    const res = await subscribeToPush();
    setPushState(res.ok ? "on" : "denied");
    if (res.ok) {
      await postJson("/api/push/test", {});
      router.refresh();
    }
  };

  const logout = async () => {
    await postJson("/api/auth/logout", {});
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl">
      <div className="page flex h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            aria-label="На сайт"
            className="flex size-8 shrink-0 items-center justify-center rounded-[11px] bg-ink text-white"
          >
            <Icon name="drop" size={16} variant="line" strokeWidth={2} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight">Заявки</p>
            <p className="truncate text-[10.5px] text-mute">кабинет владельца</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void enablePush()}
            disabled={pushState === "busy" || pushState === "on"}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors ${
              pushState === "on" || ownerSubs > 0
                ? "bg-accent-mist text-accent-deep"
                : "bg-canvas-soft text-ink-soft hover:text-ink"
            }`}
          >
            <Icon name={pushState === "on" || ownerSubs > 0 ? "bell" : "bellOff"} size={15} />
            <span className="hidden sm:inline">
              {pushState === "busy"
                ? "Включаем…"
                : pushState === "denied"
                  ? "Запрещено в браузере"
                  : pushState === "on" || ownerSubs > 0
                    ? "Push включён"
                    : "Включить push"}
            </span>
          </button>
          <Link
            href="/"
            className="hidden h-9 items-center rounded-full bg-canvas-soft px-3 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink sm:flex"
          >
            На сайт
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Выйти"
            className="flex size-9 items-center justify-center rounded-full bg-canvas-soft text-ink-soft transition-colors hover:text-danger"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
