import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findByTrackToken } from "@/lib/requests";
import { formatDuration, formatMoney, getItem, getSize, getStain, getTiming } from "@/lib/pricing";
import { BRAND } from "@/lib/brand";
import { Icon, ITEM_ICONS } from "@/components/icons";
import { PushToggle, QuoteActions } from "@/components/track/TrackActions";
import { StatusPill } from "@/components/ui";
import type { RequestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Заявка",
  robots: { index: false, follow: false, nocache: true },
};

const FLOW: { label: string; icon: "message" | "ruble" | "calendar" | "spray" | "card" }[] = [
  { label: "Заявка", icon: "message" },
  { label: "Смета", icon: "ruble" },
  { label: "Мастер", icon: "calendar" },
  { label: "Чистка", icon: "spray" },
  { label: "Оплата", icon: "card" },
];

function flowIndex(status: RequestStatus): number {
  switch (status) {
    case "new":
    case "contacted":
      return 0;
    case "quote_sent":
      return 1;
    case "confirmed":
      return 2;
    case "done":
    case "awaiting_payment":
      return 3;
    case "paid":
    case "closed":
      return 4;
    default:
      return 0;
  }
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await findByTrackToken(token);
  if (!request) notFound();

  const item = getItem(request.quiz.item);
  const size = getSize(request.quiz.item, request.quiz.size);
  const stain = getStain(request.quiz.stains);
  const timing = getTiming(request.quiz.timing);
  const step = flowIndex(request.status);
  const cancelled = request.status === "cancelled";
  const quoted = Boolean(request.quote.price && request.quote.sentAt);
  const paid = request.payment?.status === "paid";

  return (
    <main id="main" className="min-h-dvh bg-canvas-soft pb-16">
      {/* header */}
      <header className="border-b border-line bg-canvas">
        <div className="page flex h-14 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="На главную">
            <span className="flex size-7 items-center justify-center rounded-[10px] bg-ink text-white">
              <Icon name="drop" size={15} variant="line" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">Лоск.</span>
          </Link>
          <span className="rounded-full bg-canvas-soft px-2.5 py-1 font-mono text-[11.5px] font-medium text-ink-soft">
            {request.code}
          </span>
        </div>
      </header>

      <div className="page max-w-[720px] pt-4">
        {/* status */}
        <section
          className="rounded-[24px] border border-line bg-canvas p-4 sm:p-5"
          aria-labelledby="status-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill status={request.status} />
            <span className="text-[11.5px] text-mute">создана {fmtDate(request.createdAt)}</span>
          </div>

          <h1
            id="status-title"
            className="mt-2.5 text-[22px] font-semibold leading-tight tracking-[-0.03em] sm:text-[26px]"
          >
            {cancelled
              ? "Заявка отменена"
              : paid
                ? "Готово. Оплата получена"
                : quoted && request.quote.accepted === null
                  ? "Проверьте смету"
                  : request.status === "confirmed"
                    ? "Мастер назначен"
                    : request.status === "done"
                      ? "Работа выполнена: принимайте"
                      : "Заявка в работе"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            {item.label} · {size.label} · {stain.label.toLowerCase()} · {timing.label.toLowerCase()}
          </p>

          {!cancelled && (
            <ol className="mt-4 flex items-start justify-between gap-1" aria-label="Стадии заявки">
              {FLOW.map((f, i) => {
                const state = i < step ? "done" : i === step ? "current" : "todo";
                return (
                  <li
                    key={f.label}
                    className="flex flex-1 flex-col items-center gap-1.5"
                    aria-current={state === "current" ? "step" : undefined}
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                        state === "done"
                          ? "bg-accent text-white"
                          : state === "current"
                            ? "bg-ink text-white"
                            : "bg-canvas-soft text-mute"
                      }`}
                    >
                      {state === "done" ? (
                        <Icon name="check" size={14} strokeWidth={2.6} />
                      ) : (
                        <Icon name={f.icon} size={15} />
                      )}
                    </span>
                    <span
                      className={`text-center text-[10.5px] leading-tight ${state === "todo" ? "text-mute" : "font-medium text-ink"}`}
                    >
                      {f.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* quote */}
        {quoted && !paid && (
          <section
            className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5"
            aria-labelledby="quote-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="quote-title" className="text-[13px] font-medium text-mute">
                  Согласованная смета
                </h2>
                <p className="tnum mt-0.5 text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                  {formatMoney(request.quote.price ?? 0)}
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent-mist text-accent-deep">
                <Icon name="ruble" size={20} />
              </span>
            </div>

            {request.quote.note && (
              <p className="mt-2 rounded-xl bg-canvas-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-soft">
                {request.quote.note}
              </p>
            )}

            <div className="mt-3.5">
              {request.quote.accepted === null ? (
                <QuoteActions token={token} price={request.quote.price ?? 0} />
              ) : request.quote.accepted ? (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#e7f5ee] px-3 py-2 text-[12.5px] font-medium text-ok">
                  <Icon name="checkCircle" size={16} />
                  Смета согласована
                  {request.quote.respondedAt ? ` · ${fmtDate(request.quote.respondedAt)}` : ""}
                </div>
              ) : (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-[12.5px] font-medium text-warn">
                  <Icon name="info" size={16} />
                  Вы попросили уточнить смету: мы вернёмся с ответом
                </div>
              )}
            </div>

            {request.quote.accepted && (
              <Link
                href={`/pay/${request.payToken}`}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[14.5px] font-medium text-white transition-colors hover:bg-[#22252b]"
              >
                <Icon name="card" size={17} />
                Перейти к оплате
              </Link>
            )}
            <p className="mt-2 text-[11px] leading-snug text-mute">
              Оплата: после того, как примете работу. Сейчас платить не нужно.
            </p>
          </section>
        )}

        {/* paid receipt */}
        {paid && request.payment && (
          <section className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e7f5ee] text-ok">
                <Icon name="checkCircle" size={22} />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold">Оплата получена</p>
                <p className="text-[12px] text-ink-soft">
                  {formatMoney(request.payment.amount)}
                  {request.payment.receipt ? ` · чек ${request.payment.receipt}` : ""}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* estimate */}
        <section
          className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5"
          aria-labelledby="estimate-title"
        >
          <h2 id="estimate-title" className="text-[13px] font-medium text-mute">
            Из чего сложилась цена
          </h2>
          <ul className="mt-2 divide-y divide-line-soft">
            {request.estimate.lines.map((line) => (
              <li key={line.label} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-[12.5px] text-ink-soft">{line.label}</span>
                <span className="tnum shrink-0 text-[12.5px] font-medium">{formatMoney(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
            <span className="text-[12.5px] font-medium">
              Вилка · {formatDuration(request.estimate.durationMin)} работы
            </span>
            <span className="tnum text-[13px] font-semibold">
              {formatMoney(request.estimate.from)}: {formatMoney(request.estimate.to)}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-mute">
            Итоговую сумму фиксируем в смете выше. Она не меняется после начала работ.
          </p>
        </section>

        {/* photos */}
        {request.photos.published &&
          (request.photos.before.length > 0 || request.photos.after.length > 0) && (
            <section className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5">
              <h2 className="text-[13px] font-medium text-mute">Фотоотчёт</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[...request.photos.before, ...request.photos.after].map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${photo.id}`}
                      alt={photo.kind === "before" ? "Фото до чистки" : "Фото после чистки"}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <figcaption className="px-2 py-1 text-[10.5px] font-medium text-mute">
                      {photo.kind === "before" ? "До" : "После"}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

        {/* timeline */}
        <section
          className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5"
          aria-labelledby="timeline-title"
        >
          <h2 id="timeline-title" className="text-[13px] font-medium text-mute">
            История заявки
          </h2>
          <ol className="mt-2 space-y-2.5">
            {[...request.timeline].reverse().map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex gap-2.5">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-mute">
                  <Icon
                    name={
                      entry.type === "payment"
                        ? "card"
                        : entry.type === "quote"
                          ? "ruble"
                          : entry.type === "photos"
                            ? "photo"
                            : "check"
                    }
                    size={11}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium leading-snug">{entry.title}</p>
                  {entry.note ? (
                    <p className="text-[11.5px] leading-snug text-ink-soft">{entry.note}</p>
                  ) : null}
                  <p className="text-[10.5px] text-mute">{fmtDate(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* footer actions */}
        <section className="mt-3 rounded-[24px] border border-line bg-canvas p-4 sm:p-5">
          <PushToggle token={token} />
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
            <a
              href={BRAND.phoneHref}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-canvas-soft text-[13px] font-medium text-ink"
            >
              <Icon name="phone" size={15} />
              {BRAND.phoneDisplay}
            </a>
            <a
              href={BRAND.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-line text-[13px] font-medium text-ink-soft"
            >
              <Icon name="message" size={15} />
              Написать
            </a>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-mute">
            Ссылка на эту страницу: ваш доступ к заявке. Никому её не передавайте.
          </p>
        </section>

        <p className="mt-5 text-center text-[11px] text-mute">
          {BRAND.legal} · {BRAND.hours} · {BRAND.city}
        </p>
      </div>
    </main>
  );
}
