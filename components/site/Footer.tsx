import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon } from "@/components/icons";
import { Logo } from "./Nav";

/** Two groups, not the usual four-column footer. Legal links live in the
 *  bottom bar where people actually look for them. */
const GROUPS = [
  {
    title: "Услуги",
    links: [
      { href: "/chistka-mebeli-na-domu", label: "Химчистка мебели на дому" },
      { href: "/#calculator", label: "Калькулятор цены" },
      { href: "/#prices", label: "Прайс-лист" },
      { href: "/#results", label: "До и после" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: "/contacts", label: "Контакты и реквизиты" },
      { href: "/#how", label: "Как мы работаем" },
      { href: "/#faq", label: "Вопросы и ответы" },
      { href: "/admin/login", label: "Кабинет владельца" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="page py-10 sm:py-12">
        <div className="flex flex-col gap-9 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[38ch]">
            <Logo />
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
              Химчистка мягкой мебели, ковров и матрасов на дому в Москве и области. Приезжаем со своим
              оборудованием, цену фиксируем до начала работ.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={BRAND.phoneHref}
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink transition-colors hover:text-accent-deep"
              >
                <Icon name="phone" size={15} className="text-accent-deep" />
                {BRAND.phoneDisplay}
              </a>
              <a
                href={BRAND.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink"
              >
                <Icon name="message" size={14} />
                Telegram
              </a>
              <a
                href={BRAND.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft transition-colors hover:text-ink"
              >
                <Icon name="message" size={14} />
                WhatsApp
              </a>
            </div>

            <p className="mt-3 text-[11.5px] text-mute">{BRAND.hours}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14">
            {GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="text-[12.5px] font-semibold text-ink">{group.title}</h2>
                <ul className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-[12.5px] leading-snug text-ink-soft transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-line pt-4 text-[11.5px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link href="/offer" className="underline decoration-line underline-offset-2 hover:text-ink">
              Оферта
            </Link>
            <Link href="/privacy" className="underline decoration-line underline-offset-2 hover:text-ink">
              Политика данных
            </Link>
            <Link
              href="/case"
              className="font-medium text-accent-deep underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              Для владельцев бизнеса
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} {BRAND.legal}, ИНН {BRAND.inn} · МИР, Visa, Mastercard, СБП
          </p>
        </div>
      </div>
    </footer>
  );
}
