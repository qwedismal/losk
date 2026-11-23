import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { FindForm } from "@/components/track/FindForm";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Моя заявка",
  description: "Найдите заявку по коду и телефону: статус, согласованная смета, оплата.",
  alternates: { canonical: "/status" },
  robots: { index: false, follow: true },
};

export default function StatusPage() {
  return (
    <main id="main" className="min-h-dvh bg-canvas-soft px-5 py-8">
      <div className="mx-auto w-full max-w-[400px]">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="На главную">
          <span className="flex size-8 items-center justify-center rounded-[11px] bg-ink text-white">
            <Icon name="drop" size={16} variant="line" strokeWidth={2} />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.03em]">Лоск.</span>
        </Link>

        <div className="mt-5 rounded-[26px] border border-line bg-canvas p-5 shadow-soft">
          <h1 className="text-[21px] font-semibold tracking-[-0.03em]">Найти заявку</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Введите код из сообщения и телефон, который указывали. Если ссылка сохранилась: просто откройте
            её.
          </p>
          <div className="mt-4">
            <FindForm />
          </div>
        </div>

        <div className="mt-3 rounded-[20px] border border-line bg-canvas p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <Icon name="phone" size={14} className="text-accent-deep" />
            Не нашлось?
          </p>
          <p className="mt-1 text-[12px] leading-snug text-ink-soft">
            Позвоните {BRAND.phoneDisplay}: найдём заявку по номеру телефона и пришлём ссылку заново.
          </p>
          <a
            href={BRAND.phoneHref}
            className="mt-2 inline-flex h-9 items-center rounded-full bg-canvas-soft px-3.5 text-[12.5px] font-medium text-ink"
          >
            Позвонить
          </a>
        </div>

        <p className="mt-5 text-center text-[11px] text-mute">
          {BRAND.hours} · {BRAND.city}
        </p>
      </div>
    </main>
  );
}
