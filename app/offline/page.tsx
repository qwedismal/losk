import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Нет сети",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-[22px] bg-canvas-soft text-ink-soft">
        <Icon name="wifiOff" size={28} />
      </span>
      <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">Нет соединения</h1>
      <p className="mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-soft">
        Вы офлайн. Откройте страницу снова, когда появится сеть: заявка и оплата требуют подключения.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white"
      >
        На главную
      </Link>
    </main>
  );
}
