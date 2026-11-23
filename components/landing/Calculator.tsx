"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ITEMS,
  STAINS,
  TIMINGS,
  calculate,
  formatDuration,
  formatMoney,
  getItem,
  quantityDiscount,
} from "@/lib/pricing";
import type { ItemKey, QuizAnswers, SizeKey, StainLevel, TimingKey } from "@/lib/types";
import { Button } from "@/components/ui";
import { Icon, ITEM_ICONS } from "@/components/icons";
import { maskPhoneInput, postJson, csrfHeader } from "@/lib/client";
import { subscribeToPush } from "@/components/PwaProvider";
import { flushQueue, queueBooking } from "@/lib/offline-queue";

type Step = 0 | 1 | 2 | 3;
const STEP_TITLES = ["Что чистим?", "Размер и объём", "Загрязнения и срок", "Куда приехать"] as const;
const STEP_HINTS = [
  "Выберите предмет: цена пересчитается",
  "Цена зависит от площади",
  "Честно скажите, что пролили",
  "Пришлём код заявки и смету",
] as const;

interface Props {
  answers: QuizAnswers;
  setAnswers: (next: QuizAnswers) => void;
}

interface CreatedRequest {
  code: string;
  trackUrl: string;
}

export function Calculator({ answers, setAnswers }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"idle" | "on" | "denied">("idle");
  const [queued, setQueued] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  /** Stable for the lifetime of the form - an offline retry must reuse it so the
   *  server can deduplicate instead of creating a second application. */
  const clientIdRef = useRef<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<"morning" | "day" | "evening">("day");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const mountedAt = useRef<number>(Date.now());
  const liveRef = useRef<HTMLParagraphElement>(null);
  /** Optional photo: uploaded right away, claimed by the server on submit. */
  const [photo, setPhoto] = useState<{ id: string; preview: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const estimate = useMemo(() => calculate(answers), [answers]);
  const item = getItem(answers.item);
  const discount = quantityDiscount(answers.quantity);

  useEffect(() => {
    if (step > 0 && liveRef.current) {
      liveRef.current.textContent = `Шаг ${step + 1} из 4. ${STEP_TITLES[step]}. Примерная стоимость ${formatMoney(estimate.from)}`;
    }
  }, [step, estimate.from]);

  const patch = (partial: Partial<QuizAnswers>) => setAnswers({ ...answers, ...partial });

  const goNext = () => {
    if (step < 3) {
      setDirection(1);
      setStep((step + 1) as Step);
    }
  };
  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((step - 1) as Step);
    }
  };

  const buildPayload = () => ({
    clientRequestId: clientIdRef.current ?? undefined,
    quiz: answers,
    client: {
      name: name.trim(),
      phone,
      address: address.trim() || undefined,
      comment: comment.trim() || undefined,
      preferredDate: answers.timing === "asap" ? "" : date || undefined,
      preferredSlot: slot,
    },
    photoIds: photo?.id ? [photo.id] : undefined,
    website: honeypot,
    elapsedMs: Date.now() - mountedAt.current,
    consent: true as const,
  });

  const clearPhoto = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPhoto(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  /**
   * Upload immediately and keep only an opaque ID in the booking payload, so the
   * booking itself stays JSON (offline queue and idempotency keep working).
   * Client-side checks are for fast feedback; the server re-checks magic bytes.
   */
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);

    if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Подходит JPEG, PNG или WebP.");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Файл больше 5 МБ. Выберите фото поменьше.");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setPhoto({ id: "", preview });
    setPhotoBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/requests/attachments", {
        method: "POST",
        headers: csrfHeader(),
        body: form,
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as {
        photo?: { id?: string };
        error?: string;
      } | null;

      if (!res.ok || !data?.photo?.id) {
        if (previewRef.current === preview) previewRef.current = null;
        URL.revokeObjectURL(preview);
        setPhoto(null);
        setPhotoError(data?.error || "Не удалось загрузить фото. Попробуйте ещё раз.");
        return;
      }
      setPhoto({ id: data.photo.id, preview });
    } catch {
      if (previewRef.current === preview) previewRef.current = null;
      URL.revokeObjectURL(preview);
      setPhoto(null);
      setPhotoError("Сеть недоступна. Заявку можно отправить без фото.");
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Как к вам обращаться?";
    if (phone.replace(/\D/g, "").length < 11) next.phone = "Телефон в формате +7 999 123-45-67";
    if (!consent) next.consent = "Нужно согласие на обработку данных";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (photoBusy) return; // the photo is still uploading; button is disabled
    if (!clientIdRef.current) clientIdRef.current = crypto.randomUUID();

    setSubmitting(true);
    setServerError(null);

    const payload = buildPayload();
    const res = await postJson<{ code: string; trackUrl: string }>("/api/requests", payload);

    setSubmitting(false);

    if (res.status === 0) {
      // Network is gone: keep the submission on the device and replay it later.
      queueBooking(payload as unknown as Record<string, unknown>, clientIdRef.current);
      setQueued(true);
      return;
    }

    if (!res.ok || !res.data) {
      if (res.status === 422 && res.data?.fields) {
        setErrors(res.data.fields);
        return;
      }
      setServerError(res.data?.error || "Не удалось отправить заявку. Попробуйте ещё раз.");
      return;
    }

    setCreated({ code: res.data.code, trackUrl: res.data.trackUrl });
    window.history.replaceState(null, "", `#calculator`);
  };

  const retryQueued = async () => {
    setSubmitting(true);
    await flushQueue();
    setSubmitting(false);
    if (clientIdRef.current) {
      queueBooking(buildPayload() as unknown as Record<string, unknown>, clientIdRef.current);
    }
    // A successful flush dispatches a toast through PwaProvider; reflect it here too.
    setQueued(false);
    setServerError(null);
  };

  if (queued) {
    return (
      <QueuedCard onRetry={() => void retryQueued()} busy={submitting} onBack={() => setQueued(false)} />
    );
  }

  if (created) {
    return (
      <SuccessCard
        created={created}
        estimateFrom={estimate.from}
        photoAttached={Boolean(photo?.id)}
        pushState={pushState}
        onEnablePush={async () => {
          const token = created.trackUrl.split("/t/")[1];
          const r = await subscribeToPush(token);
          setPushState(r.ok ? "on" : "denied");
        }}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-canvas shadow-lift">
      {/* progress */}
      <div className="flex items-center gap-2 px-5 pt-5">
        {STEP_TITLES.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => i < step && setStep(i as Step)}
            disabled={i > step}
            aria-label={`Шаг ${i + 1}: ${t}`}
            aria-current={i === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
              i < step ? "bg-accent" : i === step ? "bg-ink" : "bg-line"
            } ${i < step ? "cursor-pointer" : "cursor-default"}`}
          />
        ))}
      </div>

      <div className="px-5 pb-5 pt-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] sm:text-[21px]">
              {STEP_TITLES[step]}
            </h2>
            <p className="mt-1 text-[13px] text-mute">{STEP_HINTS[step]}</p>
          </div>
          <span className="tnum shrink-0 text-[12px] font-medium text-mute">{step + 1} / 4</span>
        </div>

        <div key={step} className={`mt-4 ${direction === 1 ? "step-in-right" : "step-in-left"}`}>
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {ITEMS.map((it) => {
                const active = answers.item === it.key;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => {
                      patch({ item: it.key, size: it.sizes[0].key });
                      setTimeout(goNext, 180);
                    }}
                    aria-pressed={active}
                    className={`group relative flex flex-col items-start gap-2 rounded-[20px] border p-3.5 text-left transition-all duration-300 ${
                      active
                        ? "border-accent bg-accent-mist shadow-[0_10px_30px_-18px_rgba(15,182,166,.7)]"
                        : "border-line bg-canvas hover:border-ink/15 hover:bg-canvas-soft"
                    }`}
                  >
                    <Icon
                      name={ITEM_ICONS[it.key]}
                      size={26}
                      className={active ? "text-accent-deep" : "text-ink-soft"}
                    />
                    <span className="text-[15px] font-semibold">{it.label}</span>
                    <span className="text-[12px] leading-tight text-mute">от {formatMoney(it.base)}</span>
                    {active && (
                      <span className="absolute right-3 top-3 text-accent-deep">
                        <Icon name="checkCircle" size={17} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {item.sizes.map((s) => {
                  const active = answers.size === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => patch({ size: s.key })}
                      aria-pressed={active}
                      className={`rounded-[16px] border px-3 py-2.5 text-left transition-all ${
                        active ? "border-ink bg-ink text-white" : "border-line bg-canvas hover:bg-canvas-soft"
                      }`}
                    >
                      <span className="block text-[14px] font-medium">{s.label}</span>
                      <span className={`text-[11.5px] ${active ? "text-white/60" : "text-mute"}`}>
                        {formatMoney(Math.round(item.base * s.factor))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-[16px] border border-line bg-canvas-soft px-3.5 py-2.5">
                <div>
                  <p className="text-[14px] font-medium">Сколько предметов</p>
                  <p className="text-[11.5px] text-mute">
                    {discount > 0
                      ? `Скидка ${Math.round(discount * 100)}% уже в цене`
                      : "2 предмета, скидка 10%"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patch({ quantity: Math.max(1, answers.quantity - 1) })}
                    disabled={answers.quantity <= 1}
                    aria-label="Уменьшить количество"
                    className="flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-ink disabled:opacity-35"
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span className="tnum w-5 text-center text-[15px] font-semibold">{answers.quantity}</span>
                  <button
                    type="button"
                    onClick={() => patch({ quantity: Math.min(5, answers.quantity + 1) })}
                    disabled={answers.quantity >= 5}
                    aria-label="Увеличить количество"
                    className="flex size-9 items-center justify-center rounded-full border border-line bg-canvas text-ink disabled:opacity-35"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5">
              <fieldset>
                <legend className="mb-1.5 text-[12px] font-medium text-mute">Пятна</legend>
                <div className="grid gap-1.5">
                  {STAINS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => patch({ stains: s.key as StainLevel })}
                      aria-pressed={answers.stains === s.key}
                      className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-all ${
                        answers.stains === s.key
                          ? "border-ink bg-ink text-white"
                          : "border-line bg-canvas hover:bg-canvas-soft"
                      }`}
                    >
                      <span className="flex-1">
                        <span className="block text-[14px] font-medium">{s.label}</span>
                        <span
                          className={`text-[11.5px] ${answers.stains === s.key ? "text-white/60" : "text-mute"}`}
                        >
                          {s.hint}
                        </span>
                      </span>
                      {answers.stains === s.key && <Icon name="check" size={16} />}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-[12px] font-medium text-mute">Когда удобно</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIMINGS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => patch({ timing: t.key as TimingKey })}
                      aria-pressed={answers.timing === t.key}
                      className={`rounded-[14px] border px-2 py-2.5 text-center transition-all ${
                        answers.timing === t.key
                          ? "border-accent bg-accent-mist"
                          : "border-line bg-canvas hover:bg-canvas-soft"
                      }`}
                    >
                      <span className="block text-[12.5px] font-medium leading-tight">{t.label}</span>
                      <span className="mt-0.5 block text-[10.5px] leading-tight text-mute">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2.5">
              <FieldInline
                label="Имя"
                value={name}
                onChange={setName}
                error={errors.name}
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
              <FieldInline
                label="Телефон"
                value={phone}
                onChange={(v) => setPhone(maskPhoneInput(v))}
                error={errors.phone}
                placeholder="+7 (999) 123-45-67"
                inputMode="tel"
                autoComplete="tel"
              />
              <FieldInline
                label="Адрес"
                hint="не обязательно"
                value={address}
                onChange={setAddress}
                error={errors.address}
                placeholder="Улица, дом, квартира"
                autoComplete="street-address"
              />

              {/* optional photo: helps the master price the stain before arrival */}
              <div className="rounded-[16px] border border-line bg-canvas-soft p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium text-ink-soft">Фото</span>
                  <span className="text-[11px] text-mute">не обязательно · до 5 МБ</span>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void pickPhoto(e.target.files?.[0])}
                />

                {photo ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt="Выбранное фото"
                      className="size-14 shrink-0 rounded-xl border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium" aria-live="polite">
                        {photo.id ? "Фото прикреплено" : "Загружаем фото"}
                      </p>
                      <p className="text-[11px] leading-snug text-mute">
                        Мастер увидит его в заявке до выезда
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoBusy}
                        aria-label="Заменить фото"
                        className="flex size-8 items-center justify-center rounded-full border border-line bg-canvas text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
                      >
                        <Icon name="refresh" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={clearPhoto}
                        disabled={photoBusy}
                        aria-label="Удалить фото"
                        className="flex size-8 items-center justify-center rounded-full border border-line bg-canvas text-ink-soft transition-colors hover:text-danger disabled:opacity-40"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                    className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 py-2.5 text-left transition-colors hover:bg-canvas-soft disabled:opacity-50"
                  >
                    <Icon
                      name={photoBusy ? "upload" : "photo"}
                      size={16}
                      className="shrink-0 text-accent-deep"
                    />
                    <span className="text-[12.5px] font-medium">
                      {photoBusy ? "Загружаем фото" : "Прикрепить фото"}
                    </span>
                    <span className="ml-auto text-[10.5px] text-mute">JPEG, PNG, WebP</span>
                  </button>
                )}

                {photoError && (
                  <p role="alert" className="mt-1.5 text-[11.5px] font-medium leading-snug text-danger">
                    {photoError}
                  </p>
                )}
              </div>

              {answers.timing !== "asap" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-soft">Дата</span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-11 w-full rounded-[14px] border border-line bg-canvas px-3 text-[14px] outline-none focus:border-accent"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-soft">Время</span>
                    <select
                      value={slot}
                      onChange={(e) => setSlot(e.target.value as typeof slot)}
                      className="h-11 w-full rounded-[14px] border border-line bg-canvas px-2.5 text-[14px] outline-none focus:border-accent"
                    >
                      <option value="morning">8:00–12:00</option>
                      <option value="day">12:00–17:00</option>
                      <option value="evening">17:00–21:00</option>
                    </select>
                  </label>
                </div>
              )}

              <details className="rounded-[14px] border border-line bg-canvas-soft px-3 py-2">
                <summary className="cursor-pointer list-none text-[12.5px] font-medium text-ink-soft">
                  Добавить комментарий
                </summary>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="Кот, аллергия, конкретное пятно: всё, что важно знать мастеру"
                  className="mt-2 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-mute/70"
                />
              </details>

              {/* honeypot - hidden from humans, tempting for bots */}
              <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
                <label>
                  Сайт
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[12px] leading-snug text-ink-soft">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[6px] border transition-all ${
                    consent
                      ? "border-accent bg-accent text-white"
                      : errors.consent
                        ? "border-danger"
                        : "border-line bg-canvas"
                  }`}
                >
                  {consent ? <Icon name="check" size={11} strokeWidth={3} /> : null}
                </span>
                <span>
                  Согласен с{" "}
                  <a href="/privacy" className="text-ink underline decoration-line underline-offset-2">
                    политикой данных
                  </a>{" "}
                  и{" "}
                  <a href="/offer" className="text-ink underline decoration-line underline-offset-2">
                    офертой
                  </a>
                </span>
              </label>
              {errors.consent && <p className="pl-7 text-[12px] font-medium text-danger">{errors.consent}</p>}
            </div>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#fbeceb] px-3 py-2 text-[12.5px] font-medium text-danger"
          >
            {serverError}
          </p>
        )}

        {/* footer */}
        <div className="mt-4 border-t border-line pt-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11.5px] font-medium text-mute">Примерно</p>
              <p className="flex items-baseline gap-1 text-[24px] font-semibold leading-tight tracking-[-0.03em]">
                <span className="text-[15px] font-medium text-ink-soft">от</span>
                <PriceTicker value={estimate.from} />
              </p>
              <p className="text-[11.5px] text-mute">
                до {formatMoney(estimate.to)} · {formatDuration(estimate.durationMin)} работы
              </p>
            </div>
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="mb-1 flex size-10 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-canvas-soft"
                aria-label="Назад"
              >
                <Icon name="chevronLeft" size={18} />
              </button>
            ) : null}
            <Button
              onClick={step === 3 ? submit : goNext}
              loading={submitting}
              disabled={photoBusy}
              size="lg"
              iconRight={step === 3 ? "check" : "arrowRight"}
              className="mb-0.5 flex-1 sm:flex-none"
            >
              {step === 3 ? "Отправить заявку" : "Далее"}
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] leading-snug text-mute">
            Цена фиксируется после согласования: пришлём смету в заявку. Оплата только после работ.
          </p>
        </div>
      </div>

      <p ref={liveRef} aria-live="polite" className="sr-only" />
    </div>
  );
}

function FieldInline({
  label,
  hint,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  inputMode?: "tel" | "text";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-ink-soft">{label}</span>
        {hint ? <span className="text-[11px] text-mute">{hint}</span> : null}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`h-11 w-full rounded-[14px] border bg-canvas px-3.5 text-[15px] outline-none transition-colors placeholder:text-mute/70 focus:border-accent ${
          error ? "border-danger/60" : "border-line"
        }`}
      />
      {error ? (
        <span role="alert" className="mt-1 block text-[11.5px] font-medium text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SuccessCard({
  created,
  estimateFrom,
  photoAttached,
  pushState,
  onEnablePush,
}: {
  created: CreatedRequest;
  estimateFrom: number;
  photoAttached: boolean;
  pushState: "idle" | "on" | "denied";
  onEnablePush: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${created.trackUrl}` : created.trackUrl;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-canvas p-5 shadow-lift sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
          <Icon name="check" size={22} strokeWidth={2.4} />
        </span>
        <div>
          <h2 className="text-[20px] font-semibold leading-tight">Заявка принята</h2>
          <p className="mt-1 text-[13px] leading-snug text-ink-soft">
            Код <span className="font-mono font-semibold text-ink">{created.code}</span>. Смету пришлём сюда
            же: обычно в течение 15 минут.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-line bg-canvas-soft p-3.5">
        <p className="text-[12px] font-medium text-mute">Примерная стоимость</p>
        <p className="tnum text-[22px] font-semibold tracking-[-0.02em]">от {formatMoney(estimateFrom)}</p>
        <p className="mt-1 text-[12px] leading-snug text-ink-soft">
          Точную сумму согласуем в заявке до выезда. Ничего платить сейчас не нужно.
        </p>
        {photoAttached && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-accent-deep">
            <Icon name="photo" size={13} />
            Фото прикреплено к заявке
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <a
          href={created.trackUrl}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-white transition-colors hover:bg-[#22252b]"
        >
          <Icon name="eye" size={18} />
          Смотреть статус заявки
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft"
        >
          <Icon name={copied ? "check" : "link"} size={15} />
          {copied ? "Ссылка скопирована" : "Сохранить ссылку на заявку"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void onEnablePush()}
        disabled={pushState !== "idle"}
        className="mt-1 flex w-full items-center gap-2.5 rounded-[14px] border border-line px-3 py-2.5 text-left transition-colors hover:bg-canvas-soft disabled:opacity-60"
      >
        <Icon name={pushState === "on" ? "bell" : "bellOff"} size={18} className="text-accent-deep" />
        <span className="text-[12px] leading-snug text-ink-soft">
          {pushState === "on"
            ? "Уведомления включены: сообщим о смете и оплате"
            : pushState === "denied"
              ? "Уведомления отключены в браузере"
              : "Включить уведомления о статусе заявки"}
        </span>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Price ticker                                                                */
/* -------------------------------------------------------------------------- */

function PriceTicker({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return;

    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      shown.current = value;
      setDisplay(value);
      return;
    }

    const started = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const next = Math.round(from + (value - from) * eased);
      shown.current = next;
      setDisplay(next);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return <span className="tnum">{formatMoney(display)}</span>;
}

/* -------------------------------------------------------------------------- */
/* Offline-queued state                                                        */
/* -------------------------------------------------------------------------- */

function QueuedCard({ onRetry, busy, onBack }: { onRetry: () => void; busy: boolean; onBack: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-canvas p-5 shadow-lift sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sand text-warn">
          <Icon name="wifiOff" size={21} />
        </span>
        <div>
          <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.02em]">Заявка сохранена</h2>
          <p className="mt-1 text-[13px] leading-snug text-ink-soft">
            Сеть пропала в момент отправки. Заявка осталась на этом устройстве: отправим её автоматически, как
            только появится интернет.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-line bg-canvas-soft px-3.5 py-3">
        <p className="text-[12px] leading-snug text-ink-soft">
          Можно закрыть страницу: данные не потеряются. Мы пришлём код заявки, когда она дойдёт до нас.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Button onClick={onRetry} loading={busy} icon="upload">
          Отправить сейчас
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center justify-center rounded-full text-[13px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft"
        >
          Вернуться к форме
        </button>
      </div>
    </div>
  );
}
