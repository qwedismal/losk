"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { postJson } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";

interface Props {
  token: string;
  amount: number;
  code: string;
  alreadyPaid: boolean;
}

interface PaidResult {
  receipt: string | null;
  last4: string;
  amount: number;
}

function groupCard(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return num.length >= 12 && sum % 10 === 0;
}

export function PaymentForm({ token, amount, code, alreadyPaid }: Props) {
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const intentRef = useRef<{ id: string; key: string } | null>(null);

  useEffect(() => {
    setHydrated(true);
    // The idempotency key survives re-renders but not tab reloads: a fresh
    // reload must create a new payment intent attempt.
    if (!sessionStorage.getItem(`pay-key-${token}`)) {
      sessionStorage.setItem(`pay-key-${token}`, crypto.randomUUID());
    }
  }, [token]);

  if (alreadyPaid || paid) {
    return (
      <div className="rounded-[26px] border border-line bg-canvas p-6 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e7f5ee] text-ok">
          <Icon name="checkCircle" size={28} />
        </span>
        <h2 className="mt-3 text-[20px] font-semibold">Оплата прошла</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          {formatMoney(paid?.amount ?? amount)}
          {paid?.last4 ? ` · карта **** ${paid.last4}` : ""}
        </p>
        {paid?.receipt ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-canvas-soft px-3 py-1.5 font-mono text-[11.5px] text-ink-soft">
            <Icon name="check" size={12} />
            Чек {paid.receipt}
          </p>
        ) : null}
        <p className="mt-3 text-[12px] leading-snug text-mute">
          Спасибо. Чек и статус сохраняются в заявке {code}.
        </p>
      </div>
    );
  }

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!luhn(card.replace(/\s/g, ""))) next.card = "Проверьте номер карты";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) next.expiry = "ММ/ГГ";
    if (!/^\d{3,4}$/.test(cvc)) next.cvc = "3 цифры";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFailure(null);

    const key = sessionStorage.getItem(`pay-key-${token}`) ?? crypto.randomUUID();

    if (!intentRef.current || intentRef.current.key !== key) {
      const intent = await postJson<{ paymentId: string }>("/api/payments/intent", {
        token,
        idempotencyKey: key,
      });
      if (!intent.ok || !intent.data?.paymentId) {
        setBusy(false);
        setFailure(intent.data?.error || "Не удалось создать платёж");
        return;
      }
      intentRef.current = { id: intent.data.paymentId, key };
    }

    const res = await postJson<PaidResult>("/api/payments/confirm", {
      token,
      paymentId: intentRef.current.id,
      idempotencyKey: key,
      card: card.replace(/\s/g, ""),
      expiry,
      cvc,
      holder: holder || undefined,
    });

    setBusy(false);

    if (!res.ok || !res.data) {
      setFailure(res.data?.error || "Платёж не прошёл. Попробуйте другую карту.");
      // A failed payment invalidates the intent: next attempt needs a new one.
      intentRef.current = null;
      sessionStorage.removeItem(`pay-key-${token}`);
      return;
    }

    setPaid({ receipt: res.data.receipt ?? null, last4: res.data.last4, amount: res.data.amount });
    sessionStorage.removeItem(`pay-key-${token}`);
  };

  return (
    <form
      className="rounded-[26px] border border-line bg-canvas p-4 shadow-soft sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-mute">К оплате</p>
          <p className="tnum text-[30px] font-semibold leading-tight tracking-[-0.03em]">
            {formatMoney(amount)}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-accent-mist px-2.5 py-1 text-[11px] font-medium text-accent-deep">
          <Icon name="lock" size={12} />
          безопасно
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-soft">Номер карты</span>
          <div
            className={`flex items-center gap-2 rounded-[14px] border bg-canvas px-3.5 transition-colors focus-within:border-accent ${
              errors.card ? "border-danger/60" : "border-line"
            }`}
          >
            <Icon name="card" size={17} className="text-mute" />
            <input
              value={card}
              onChange={(e) => setCard(groupCard(e.target.value))}
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              autoComplete="cc-number"
              aria-invalid={errors.card ? true : undefined}
              aria-label="Номер карты"
              className="tnum h-12 w-full bg-transparent text-[16px] tracking-wide outline-none placeholder:text-mute/60"
            />
          </div>
          {errors.card ? (
            <span className="mt-1 block text-[11.5px] font-medium text-danger">{errors.card}</span>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft">Срок</span>
            <input
              value={expiry}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
              }}
              placeholder="ММ/ГГ"
              inputMode="numeric"
              autoComplete="cc-exp"
              aria-invalid={errors.expiry ? true : undefined}
              aria-label="Срок действия"
              className={`tnum h-11 w-full rounded-[14px] border bg-canvas px-3.5 text-[16px] outline-none focus:border-accent ${
                errors.expiry ? "border-danger/60" : "border-line"
              }`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-ink-soft">CVC</span>
            <input
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              inputMode="numeric"
              autoComplete="cc-csc"
              type="password"
              aria-invalid={errors.cvc ? true : undefined}
              aria-label="CVC код"
              className={`tnum h-11 w-full rounded-[14px] border bg-canvas px-3.5 text-[16px] outline-none focus:border-accent ${
                errors.cvc ? "border-danger/60" : "border-line"
              }`}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-soft">
            Имя на карте <span className="text-mute">(не обязательно)</span>
          </span>
          <input
            value={holder}
            onChange={(e) => setHolder(e.target.value.toUpperCase().slice(0, 40))}
            placeholder="IVAN IVANOV"
            autoComplete="cc-name"
            className="h-11 w-full rounded-[14px] border border-line bg-canvas px-3.5 text-[15px] outline-none focus:border-accent"
          />
        </label>
      </div>

      {failure && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-[#fbeceb] px-3 py-2 text-[12.5px] font-medium text-danger"
        >
          {failure}
        </p>
      )}

      <Button type="submit" size="lg" block loading={busy} icon="lock" className="mt-4" disabled={!hydrated}>
        Оплатить {formatMoney(amount)}
      </Button>

      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-mute">
        <Icon name="shield" size={13} className="mt-px shrink-0" />
        Данные карты не сохраняются: используются только для расчёта в защищённом обработчике и сразу
        отбрасываются.
      </p>

      <details className="mt-3 rounded-xl bg-canvas-soft px-3 py-2 text-[11.5px] text-ink-soft">
        <summary className="cursor-pointer font-medium">Тестовые карты (демо-шлюз)</summary>
        <p className="mt-1.5 leading-relaxed">
          Успех: <span className="font-mono">4242 4242 4242 4242</span>, срок{" "}
          <span className="font-mono">12/34</span>, CVC <span className="font-mono">123</span>. Отказ:{" "}
          <span className="font-mono">4000 0000 0000 0002</span>. Реальные карты не списываются.
        </p>
      </details>
    </form>
  );
}
