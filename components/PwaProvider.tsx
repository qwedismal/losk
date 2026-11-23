"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { csrfHeader } from "@/lib/client";
import { flushQueue, queuedCount, QUEUE_EVENTS } from "@/lib/offline-queue";
import { withCount } from "@/lib/format";

/**
 * Service-worker registration, network status and the offline booking queue.
 *
 * The SW is registered only in production builds: in `next dev` the worker would
 * cache stale chunks and fight HMR, which makes local iteration unpredictable.
 */
export function PwaProvider() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // --- network status ------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      setOffline(!navigator.onLine);
      setPending(queuedCount());
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // --- flush the booking queue --------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = async () => {
      const result = await flushQueue();
      setPending(queuedCount());
      if (result.sent > 0) {
        setToast(
          result.codes.length > 0
            ? `Заявка отправлена: код ${result.codes[0]}`
            : "Заявка отправлена. Мы свяжемся с вами.",
        );
      }
    };

    void run();
    window.addEventListener("online", run);
    const sync = () => setPending(queuedCount());
    window.addEventListener(QUEUE_EVENTS.sent, sync);
    window.addEventListener(QUEUE_EVENTS.dropped, sync);
    window.addEventListener(QUEUE_EVENTS.added, sync);

    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener(QUEUE_EVENTS.sent, sync);
      window.removeEventListener(QUEUE_EVENTS.dropped, sync);
      window.removeEventListener(QUEUE_EVENTS.added, sync);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  // --- service worker ------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Clean up any worker left over from a previous production run.
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    let cancelled = false;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;
        void reg.update().catch(() => {});
      } catch {
        /* registration failures are non-fatal */
      }
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {offline ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[13px] font-medium text-white"
        >
          <Icon name="wifiOff" size={16} />
          {pending > 0
            ? `Нет сети: ${withCount(pending, ["заявка", "заявки", "заявок"])} сохранена на устройстве и отправится автоматически`
            : "Нет сети, страница работает из кэша, заявку можно заполнить"}
        </div>
      ) : null}

      {pending > 0 && !offline ? (
        <div
          role="status"
          className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-ink px-4 py-2.5 text-[12.5px] font-medium text-white shadow-lift sm:inset-x-auto sm:right-4"
        >
          <Icon name="upload" size={16} className="shrink-0" />
          Отправляем сохранённую заявку…
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-[95] mx-auto flex max-w-md animate-pop items-center gap-2.5 rounded-2xl bg-accent-deep px-4 py-3 text-[13px] font-medium text-white shadow-lift sm:inset-x-auto sm:right-4"
        >
          <Icon name="checkCircle" size={17} className="shrink-0" />
          {toast}
        </div>
      ) : null}
    </>
  );
}

/** Exposed for the admin settings screen. */
export async function subscribeToPush(token?: string): Promise<{ ok: boolean; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Браузер не поддерживает push-уведомления" };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Уведомления отключены в настройках браузера" };
  }
  const reg = await navigator.serviceWorker.ready;
  const vapid = await fetch("/api/push/key", { cache: "no-store" }).then((r) => r.json());
  if (!vapid?.publicKey) return { ok: false, message: "Push временно недоступен" };

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-losk-client": "1", ...csrfHeader() },
    body: JSON.stringify({
      audience: token ? "client" : "owner",
      token,
      subscription: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.toJSON().keys?.p256dh, auth: sub.toJSON().keys?.auth },
      },
    }),
  });
  if (!res.ok) return { ok: false, message: "Не удалось сохранить подписку" };
  return { ok: true, message: "Уведомления включены" };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer;
}
