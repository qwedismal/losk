import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-[22px] bg-canvas-soft text-ink-soft">
        <Icon name="info" size={28} />
      </span>
      <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Страница не найдена</h1>
      <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-soft">
        Возможно, ссылка устарела. Проверьте код заявки или вернитесь на главную: там калькулятор и все
        контакты.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white"
        >
          На главную
        </Link>
        <Link
          href="/status"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-[14px] font-medium text-ink-soft"
        >
          <Icon name="eye" size={16} />
          Найти заявку
        </Link>
      </div>
    </main>
  );
}
