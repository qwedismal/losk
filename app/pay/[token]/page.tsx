import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findByPayToken } from "@/lib/requests";
import { formatMoney } from "@/lib/pricing";
import { Icon } from "@/components/icons";
import { PaymentForm } from "@/components/pay/PaymentForm";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оплата заявки",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await findByPayToken(token);
  if (!request) notFound();

  const amount = request.quote.price ?? 0;
  const alreadyPaid = request.payment?.status === "paid";

  return (
    <main id="main" className="min-h-dvh bg-canvas-soft pb-16">
      <header className="border-b border-line bg-canvas">
        <div className="page flex h-14 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="На главную">
            <span className="flex size-7 items-center justify-center rounded-[10px] bg-ink text-white">
              <Icon name="drop" size={15} variant="line" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.03em]">Лоск.</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
            <Icon name="lock" size={14} className="text-accent-deep" />
            Защищённая оплата
          </span>
        </div>
      </header>

      <div className="page max-w-[460px] pt-5">
        <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-line bg-canvas px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium">Заявка {request.code}</p>
            <p className="truncate text-[11px] text-mute">{request.client.name}</p>
          </div>
          <Link
            href={`/t/${request.trackToken}`}
            className="shrink-0 text-[11.5px] font-medium text-accent-deep"
          >
            К заявке
          </Link>
        </div>

        {amount > 0 ? (
          <PaymentForm token={token} amount={amount} code={request.code} alreadyPaid={alreadyPaid} />
        ) : (
          <div className="rounded-[26px] border border-line bg-canvas p-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sand text-warn">
              <Icon name="clock" size={24} />
            </span>
            <h1 className="mt-3 text-[18px] font-semibold">Смета ещё согласуется</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Как только цена будет зафиксирована, здесь появится кнопка оплаты. Мы пришлём уведомление.
            </p>
            <Link
              href={`/t/${request.trackToken}`}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white"
            >
              <Icon name="eye" size={16} />
              Смотреть заявку
            </Link>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: "shield" as const, text: "3-D Secure" },
            { icon: "lock" as const, text: "TLS 1.3" },
            { icon: "check" as const, text: "Чек по 54-ФЗ" },
          ].map((b) => (
            <div
              key={b.text}
              className="flex flex-col items-center gap-1 rounded-xl border border-line bg-canvas px-2 py-2.5 text-center"
            >
              <Icon name={b.icon} size={15} className="text-accent-deep" />
              <span className="text-[10.5px] font-medium leading-tight text-ink-soft">{b.text}</span>
            </div>
          ))}
        </div>

        {amount > 0 && !alreadyPaid && (
          <p className="mt-4 text-center text-[11px] leading-snug text-mute">
            Оплата означает согласие с{" "}
            <Link href="/offer" className="underline decoration-line underline-offset-2">
              офертой
            </Link>
            . Вопросы по оплате: {BRAND.phoneDisplay}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-dashed border-line px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <Icon name="info" size={12} />
            демонстрационный шлюз
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
            Сайт использует встроенный sandbox-провайдер: реальные деньги не списываются, карта не
            сохраняется. Для продакшена подключается ЮKassa, Stripe или Т-Банк: интерфейс{" "}
            <code className="font-mono">lib/payments.ts</code> уже разделён на «создать платёж / подтвердить /
            вебхук».
          </p>
        </div>

        <p className="mt-5 text-center text-[11px] text-mute">
          {BRAND.legal} · ИНН {BRAND.inn}
        </p>
      </div>
    </main>
  );
}
