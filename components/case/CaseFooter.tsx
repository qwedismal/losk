import Link from "next/link";
import { Logo } from "@/components/site/Nav";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/", label: "Живое демо" },
  { href: "/case/print", label: "Версия для PDF" },
  { href: "/contacts", label: "Контакты и реквизиты" },
  { href: "/privacy", label: "Политика обработки данных" },
];

export function CaseFooter() {
  return (
    <footer className="border-t border-line bg-canvas-soft print:hidden">
      <div className="page py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-12">
          <div className="max-w-[46ch]">
            <div className="[&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center">
              <Logo />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
              Демо-проект «Лоск»: сайт химчистки с калькулятором, заявками, кабинетом владельца и оплатой.
              Служебная страница для показа покупателям: поисковиками не индексируется.
            </p>
          </div>

          <nav aria-label="Ссылки кейса" className="sm:min-w-[220px]">
            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-[13px] leading-snug text-ink-soft transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-[11.5px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.legal}
          </p>
          <p>
            {BRAND.city} · {BRAND.hours}
          </p>
        </div>
      </div>
    </footer>
  );
}
