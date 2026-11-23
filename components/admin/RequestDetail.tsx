"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/ui";
import { patchJson, postJson } from "@/lib/client";
import { formatDuration, formatMoney, getItem, getSize, getStain, getTiming } from "@/lib/pricing";
import type { PhotoRef, RequestStatus, ServiceRequest } from "@/lib/types";

const STATUS_ORDER: { key: RequestStatus; label: string }[] = [
  { key: "contacted", label: "Связались" },
  { key: "quote_sent", label: "Смета отправлена" },
  { key: "confirmed", label: "Мастер назначен" },
  { key: "done", label: "Выполнено" },
  { key: "awaiting_payment", label: "Ждёт оплаты" },
  { key: "paid", label: "Оплачено" },
  { key: "closed", label: "Закрыть" },
  { key: "cancelled", label: "Отменить" },
];

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}

export function RequestDetail({ request, csrf }: { request: ServiceRequest; csrf: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [price, setPrice] = useState(String(request.quote.price ?? request.estimate.from));
  const [quoteNote, setQuoteNote] = useState(request.quote.note || "");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<"before" | "after">("after");
  /** Full-size view of a photo attached to the request. */
  const [lightbox, setLightbox] = useState<PhotoRef | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const item = getItem(request.quiz.item);
  const size = getSize(request.quiz.item, request.quiz.size);
  const headers = { "x-csrf-token": csrf };

  const notify = (text: string, tone: "ok" | "err" = "ok") => {
    setFlash({ text, tone });
    setTimeout(() => setFlash(null), 3200);
  };

  const patch = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    const res = await patchJson(`/api/admin/requests/${request.id}`, body, { headers } as never);
    setBusy(null);
    if (!res.ok) {
      notify(res.data?.error || "Не удалось сохранить", "err");
      return false;
    }
    notify("Сохранено");
    router.refresh();
    return true;
  };

  const upload = async (file: File) => {
    setBusy("upload");
    const form = new FormData();
    form.append("file", file);
    form.append("kind", uploadKind);
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/photos`, {
        method: "POST",
        headers: { "x-csrf-token": csrf },
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) notify(data?.error || "Не удалось загрузить фото", "err");
      else {
        notify("Фото добавлено");
        router.refresh();
      }
    } catch {
      notify("Ошибка сети", "err");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (photoId: string) => {
    setBusy(`delete-${photoId}`);
    try {
      const res = await fetch(
        `/api/admin/requests/${request.id}/photos?photoId=${encodeURIComponent(photoId)}`,
        { method: "DELETE", headers },
      );
      if (res.ok) {
        if (lightbox?.id === photoId) setLightbox(null);
        notify("Фото удалено");
        router.refresh();
      } else notify("Не удалось удалить", "err");
    } catch {
      notify("Ошибка сети", "err");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Full URLs need the browser origin, but reading `window` during the first
   * render made the server render `/t/...` and the client `http://.../t/...`,
   * which React reports as a hydration mismatch. Set the origin after mount:
   * the first client render matches the server, then the URL is completed.
   */
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const trackUrl = `${origin}/t/${request.trackToken}`;
  const payUrl = `${origin}/pay/${request.payToken}`;

  return (
    <div className="page max-w-[760px] pb-16 pt-3">
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="flex size-9 items-center justify-center rounded-full bg-canvas text-ink-soft shadow-soft"
          aria-label="К списку заявок"
        >
          <Icon name="chevronLeft" size={17} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.03em]">{request.client.name}</h1>
            <StatusPill status={request.status} />
          </div>
          <p className="truncate text-[11.5px] text-mute">
            <span className="font-mono">{request.code}</span> · создана {fmt(request.createdAt)}
          </p>
        </div>
        <a
          href={`tel:${request.client.phone}`}
          className="flex size-9 items-center justify-center rounded-full bg-accent text-white"
          aria-label="Позвонить клиенту"
        >
          <Icon name="phone" size={17} />
        </a>
      </div>

      {flash && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-3 py-2 text-[12.5px] font-medium ${
            flash.tone === "ok" ? "bg-accent-mist text-accent-deep" : "bg-[#fbeceb] text-danger"
          }`}
        >
          {flash.text}
        </p>
      )}

      {/* ------------------------------ quote ------------------------------ */}
      <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Смета для клиента</h2>
          <span className="text-[11px] text-mute">
            вилка {formatMoney(request.estimate.from)}: {formatMoney(request.estimate.to)}
          </span>
        </div>

        <div className="mt-2.5 flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-soft">Итоговая цена, ₽</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 7))}
              inputMode="numeric"
              className="tnum h-11 w-full rounded-[13px] border border-line bg-canvas px-3 text-[16px] font-semibold outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              const value = Number(price);
              if (!value) return notify("Укажите цену", "err");
              await patch({ action: "quote", price: value, note: quoteNote, notifyClient: true }, "quote");
            }}
            disabled={busy === "quote"}
            className="flex h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white disabled:opacity-50"
          >
            <Icon name={request.quote.sentAt ? "check" : "ruble"} size={15} />
            {request.quote.sentAt ? "Обновить" : "Отправить"}
          </button>
        </div>

        <input
          value={quoteNote}
          onChange={(e) => setQuoteNote(e.target.value.slice(0, 300))}
          placeholder="Комментарий к смете (клиент увидит)"
          className="mt-2 h-10 w-full rounded-[13px] border border-line bg-canvas px-3 text-[13px] outline-none focus:border-accent"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
          {request.quote.sentAt ? (
            <span className="rounded-full bg-canvas-soft px-2 py-1 text-ink-soft">
              отправлена {fmt(request.quote.sentAt)}
            </span>
          ) : null}
          {request.quote.accepted === true && (
            <span className="flex items-center gap-1 rounded-full bg-[#e7f5ee] px-2 py-1 font-medium text-ok">
              <Icon name="checkCircle" size={12} /> клиент согласовал
            </span>
          )}
          {request.quote.accepted === false && (
            <span className="flex items-center gap-1 rounded-full bg-sand px-2 py-1 font-medium text-warn">
              <Icon name="info" size={12} /> просит уточнить
            </span>
          )}
          {request.payment?.status === "paid" && (
            <span className="rounded-full bg-[#e7f5ee] px-2 py-1 font-medium text-ok">
              оплачено {formatMoney(request.payment.amount)} · чек {request.payment.receipt}
            </span>
          )}
        </div>

        {request.quote.accepted && request.payment?.status !== "paid" && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(payUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
              notify(copied ? "Ссылка на оплату скопирована" : "Ссылка на оплату скопирована");
            }}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-line py-2 text-[12.5px] font-medium text-ink-soft"
          >
            <Icon name="card" size={14} />
            Скопировать ссылку на оплату {formatMoney(request.quote.price ?? 0)}
          </button>
        )}
      </section>

      {/* ------------------------------ statuses ------------------------------ */}
      <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
        <h2 className="text-[13px] font-semibold">Статус заявки</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUS_ORDER.filter((s) => s.key !== request.status).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                void patch({ action: "status", status: s.key, notifyClient: true }, `status-${s.key}`)
              }
              disabled={busy === `status-${s.key}`}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                s.key === "cancelled"
                  ? "border-danger/30 text-danger hover:bg-[#fbeceb]"
                  : "border-line text-ink-soft hover:bg-canvas-soft hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-mute">
          Клиент получит push-уведомление и увидит новый шаг в истории заявки.
        </p>
      </section>

      {/* -------------------------- client photo -------------------------- */}
      {request.photos.client.length > 0 && (
        <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">Фото от клиента</h2>
            <span className="rounded-full bg-accent-mist px-2 py-0.5 text-[10.5px] font-medium text-accent-deep">
              {request.photos.client.length === 1 ? "1 фото" : `${request.photos.client.length} фото`}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {request.photos.client.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => setLightbox(p)}
                  aria-label="Открыть фото полностью"
                  className="block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-deep"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${p.id}`}
                    alt="Фото, приложенное клиентом"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void removePhoto(p.id)}
                  disabled={busy === `delete-${p.id}`}
                  aria-label="Удалить фото клиента"
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-mute">
            Клиент приложил фото при отправке заявки. Нажмите, чтобы рассмотреть ткань. Публично оно не видно:
            только в этом кабинете.
          </p>
        </section>
      )}

      {/* ------------------------------ photos ------------------------------ */}
      <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold">Фото до / после</h2>
          <button
            type="button"
            onClick={() => void patch({ action: "publish", published: !request.photos.published }, "publish")}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              request.photos.published ? "bg-accent-mist text-accent-deep" : "bg-canvas-soft text-ink-soft"
            }`}
          >
            <Icon name={request.photos.published ? "eye" : "lock"} size={12} />
            {request.photos.published ? "видно клиенту" : "скрыто"}
          </button>
        </div>

        <div className="mt-2 flex gap-1.5">
          {(["before", "after"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setUploadKind(k);
                fileRef.current?.click();
              }}
              disabled={busy === "upload"}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft disabled:opacity-50"
            >
              <Icon name="upload" size={14} />
              {k === "before" ? "Добавить «до»" : "Добавить «после»"}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />

        {(request.photos.before.length > 0 || request.photos.after.length > 0) && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[...request.photos.before, ...request.photos.after].map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${p.id}`}
                  alt={p.kind === "before" ? "Фото до" : "Фото после"}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  {p.kind === "before" ? "до" : "после"}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setBusy("delete");
                    const res = await fetch(
                      `/api/admin/requests/${request.id}/photos?photoId=${encodeURIComponent(p.id)}`,
                      { method: "DELETE", headers },
                    );
                    setBusy(null);
                    if (res.ok) {
                      notify("Фото удалено");
                      router.refresh();
                    } else notify("Не удалось удалить", "err");
                  }}
                  aria-label="Удалить фото"
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-snug text-mute">
          JPEG, PNG, WebP или AVIF до 5 МБ. Публикация: только по согласию клиента, фото появятся в его заявке
          и в галерее на сайте.
        </p>
      </section>

      {/* ------------------------------ details ------------------------------ */}
      <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
        <h2 className="text-[13px] font-semibold">Детали заявки</h2>
        <dl className="mt-2 divide-y divide-line-soft">
          <Row label="Телефон" value={request.client.phone} mono />
          <Row label="Адрес" value={request.client.address || "не указан"} />
          <Row label="Что чистим" value={`${item.label} · ${size.label}`} />
          <Row label="Загрязнения" value={getStain(request.quiz.stains).label} />
          <Row label="Срок" value={getTiming(request.quiz.timing).label} />
          {request.client.preferredDate ? <Row label="Дата" value={request.client.preferredDate} /> : null}
          {request.client.preferredSlot ? (
            <Row
              label="Время"
              value={
                { morning: "8:00–12:00", day: "12:00–17:00", evening: "17:00–21:00" }[
                  request.client.preferredSlot
                ]
              }
            />
          ) : null}
          <Row label="Количество" value={String(request.quiz.quantity)} />
          <Row label="Время работ" value={formatDuration(request.estimate.durationMin)} />
          {request.client.comment ? <Row label="Комментарий" value={request.client.comment} /> : null}
        </dl>

        <div className="mt-2.5 rounded-xl bg-canvas-soft p-2.5">
          <p className="text-[10.5px] font-medium tracking-[0.01em] text-mute">Ссылка для клиента</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-2 py-1.5 font-mono text-[10.5px] text-ink-soft">
              {trackUrl}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(trackUrl);
                notify("Ссылка скопирована");
              }}
              className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-white"
            >
              Копировать
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------ timeline ------------------------------ */}
      <section className="mt-3 rounded-[22px] border border-line bg-canvas p-4">
        <h2 className="text-[13px] font-semibold">История</h2>
        <ol className="mt-2 space-y-2">
          {[...request.timeline].reverse().map((t, i) => (
            <li key={`${t.at}-${i}`} className="flex gap-2">
              <span
                className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ${
                  t.clientVisible ? "bg-accent-mist text-accent-deep" : "bg-canvas-soft text-mute"
                }`}
              >
                <Icon name={t.clientVisible ? "eye" : "lock"} size={9} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium leading-snug">{t.title}</p>
                {t.note ? <p className="text-[11px] leading-snug text-ink-soft">{t.note}</p> : null}
                <p className="text-[10px] text-mute">{fmt(t.at)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex gap-1.5 border-t border-line pt-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 400))}
            placeholder="Внутренняя заметка (клиент не видит)"
            className="h-10 min-w-0 flex-1 rounded-[12px] border border-line bg-canvas px-3 text-[13px] outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={async () => {
              if (!note.trim()) return;
              const ok = await patch({ action: "note", text: note }, "note");
              if (ok) setNote("");
            }}
            disabled={busy === "note"}
            className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-canvas-soft px-3.5 text-[12px] font-medium text-ink"
          >
            <Icon name="plus" size={13} />
            Добавить
          </button>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${request.client.phone}`}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[13.5px] font-medium text-white"
        >
          <Icon name="phone" size={15} />
          Позвонить
        </a>
        <a
          href={`https://wa.me/${request.client.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-canvas text-[13.5px] font-medium text-ink-soft"
        >
          <Icon name="message" size={15} />
          WhatsApp
        </a>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Фото из заявки"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            autoFocus
            aria-label="Закрыть фото"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon name="close" size={19} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${lightbox.id}`}
            alt="Фото из заявки в полном размере"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[86dvh] w-auto max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11.5px] text-mute">{label}</dt>
      <dd className={`min-w-0 text-right text-[12.5px] font-medium ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
