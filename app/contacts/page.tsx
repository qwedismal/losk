import type { Metadata } from "next";
import Link from "next/link";

import { Icon, IconPlate, type IconName } from "@/components/icons";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ButtonLink, Eyebrow, SectionHead } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { dateRu, LEGAL } from "@/lib/legal";

const PATH = "/contacts";

const TITLE = "Контакты и реквизиты";
const DESCRIPTION =
  "Телефон, почта, WhatsApp и Telegram «Лоск», часы работы ежедневно 8:00–22:00, адрес для документов, реквизиты ИП, районы выезда по Москве и области.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
  },
};

export const dynamic = "force-static";

const CHANNELS: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  note: string;
  external?: boolean;
}[] = [
  {
    icon: "phone",
    label: "Телефон",
    value: BRAND.phoneDisplay,
    href: BRAND.phoneHref,
    note: "Мастер отвечает ежедневно с 8:00 до 22:00.",
  },
  {
    icon: "message",
    label: "WhatsApp",
    value: "Написать в WhatsApp",
    href: BRAND.whatsapp,
    note: "Удобно прислать фото загрязнений для точной сметы.",
    external: true,
  },
  {
    icon: "message",
    label: "Telegram",
    value: "Написать в Telegram",
    href: BRAND.telegram,
    note: "Тот же канал заявок и статусов, без звонков.",
    external: true,
  },
  {
    icon: "card",
    label: "Почта",
    value: BRAND.email,
    href: `mailto:${BRAND.email}`,
    note: "Чеки, документы, претензии и запросы по персональным данным.",
  },
];

const DISTRICTS = [
  "ЦАО",
  "САО",
  "СВАО",
  "ВАО",
  "ЮВАО",
  "ЮАО",
  "ЮЗАО",
  "ЗАО",
  "СЗАО",
  "Химки",
  "Мытищи",
  "Красногорск",
  "Люберцы",
  "Одинцово",
];

const REQUISITES: { term: string; value: string }[] = [
  { term: "Наименование", value: LEGAL.operatorFull },
  { term: "ИНН", value: LEGAL.inn },
  { term: "ОГРНИП", value: LEGAL.ogrnip },
  { term: "Адрес для корреспонденции", value: LEGAL.address },
  { term: "Телефон", value: LEGAL.phoneDisplay },
  { term: "Электронная почта", value: LEGAL.email },
  { term: "Часы работы", value: BRAND.hours },
];

export default function ContactsPage() {
  return (
    <>
      <Nav />
      <main id="main">
        <article className="bg-canvas pb-20 sm:pb-28">
          <header className="relative isolate overflow-hidden border-b border-line">
            <div aria-hidden className="aurora" />
            <div className="page relative py-9 sm:py-14">
              <nav aria-label="Хлебные крошки" className="mb-6">
                <ol className="flex flex-wrap items-center gap-2 text-[12.5px] text-mute">
                  <li>
                    <Link
                      href="/"
                      className="inline-flex min-h-11 items-center transition-colors hover:text-ink"
                    >
                      Главная
                    </Link>
                  </li>
                  <li aria-hidden className="text-line">
                    /
                  </li>
                  <li aria-current="page" className="text-ink-soft">
                    Контакты и реквизиты
                  </li>
                </ol>
              </nav>

              <Eyebrow>Связаться</Eyebrow>
              <h1 className="mt-3.5 max-w-[24ch] text-[clamp(27px,5.6vw,44px)] font-semibold text-ink">
                Контакты и реквизиты
              </h1>
              <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-soft sm:text-[16px]">
                Принимаем заявки по телефону, в WhatsApp и Telegram: ежедневно с 8:00 до 22:00. Выезд в день
                заявки, цена фиксируется до начала работ.
              </p>
            </div>
          </header>

          <div className="page pt-10 sm:pt-14">
            <div className="mx-auto max-w-[860px] space-y-14">
              {/* -------------------------------------------------------- channels */}
              <section aria-labelledby="channels-title" className="space-y-5">
                <h2 id="channels-title" className="text-[19px] font-semibold text-ink sm:text-[22px]">
                  Как связаться
                </h2>

                <ul className="grid gap-3 sm:grid-cols-2">
                  {CHANNELS.map((channel) => (
                    <li
                      key={channel.label}
                      className="flex h-full flex-col rounded-card border border-line bg-canvas p-5 shadow-soft"
                    >
                      <div className="flex items-center gap-3">
                        <IconPlate name={channel.icon} size={18} />
                        <span className="text-[11.5px] font-semibold tracking-[0.01em] text-mute">
                          {channel.label}
                        </span>
                      </div>

                      {channel.href ? (
                        <a
                          href={channel.href}
                          {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="mt-3 inline-flex min-h-11 items-center gap-1.5 break-words text-[16px] font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
                        >
                          {channel.value}
                          {channel.external ? (
                            <Icon name="arrowUpRight" size={15} className="shrink-0 text-mute" />
                          ) : null}
                        </a>
                      ) : (
                        <p className="mt-3 break-words text-[16px] font-medium text-ink">{channel.value}</p>
                      )}

                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-soft">{channel.note}</p>
                    </li>
                  ))}
                </ul>

                <div className="rounded-card border border-line bg-canvas-soft p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <IconPlate name="calendar" size={18} />
                    <p className="text-[13.5px] font-medium text-ink">График приёма заявок и выездов</p>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                    {BRAND.hours}. Заявки, оставленные после 22:00, обрабатываем утром: первым сообщением.
                    Срочный выезд «сегодня-завтра» зависит от свободных слотов; если слота нет, предложим
                    ближайшую дату, не подменяя её «ожиданием звонка».
                  </p>
                </div>
              </section>

              {/* ---------------------------------------------------------- address */}
              <section aria-labelledby="address-title" className="space-y-5">
                <h2 id="address-title" className="text-[19px] font-semibold text-ink sm:text-[22px]">
                  Адрес и формат работы
                </h2>

                <div className="rounded-card border border-line bg-canvas p-5 shadow-soft sm:p-6">
                  <div className="flex items-start gap-3">
                    <IconPlate name="pin" size={18} />
                    <div>
                      <p className="text-[15px] font-medium text-ink">{BRAND.address}</p>
                      <p className="mt-1 text-[13px] text-mute">Адрес для документов и корреспонденции</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
                    Мебель не вывозим: чистка проходит у вас дома или в офисе, мастер приезжает со своим
                    оборудованием и водой. Пункта приёма вещей по этому адресу нет: это важно, если вы
                    планируете привезти ковёр самостоятельно.
                  </p>
                </div>
              </section>

              {/* --------------------------------------------------------- districts */}
              <section aria-labelledby="districts-title" className="space-y-5">
                <h2 id="districts-title" className="text-[19px] font-semibold text-ink sm:text-[22px]">
                  Районы выезда
                </h2>

                <div className="rounded-card border border-line bg-canvas p-5 shadow-soft sm:p-6">
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] text-ink-soft sm:grid-cols-3">
                    {DISTRICTS.map((district) => (
                      <li key={district} className="flex items-center gap-2">
                        <Icon name="check" size={13} className="shrink-0 text-accent-deep" />
                        {district}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-mute">
                    Выезд в пределах МКАД включён в стоимость. За МКАД и в ближнее Подмосковье стоимость
                    выезда согласуем отдельно и фиксируем в заявке до начала работ.
                  </p>
                </div>
              </section>

              {/* ------------------------------------------------------- requisites */}
              <section aria-labelledby="requisites-title" className="space-y-5">
                <h2 id="requisites-title" className="text-[19px] font-semibold text-ink sm:text-[22px]">
                  Реквизиты
                </h2>

                <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
                  {REQUISITES.map((row) => (
                    <div
                      key={row.term}
                      className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6"
                    >
                      <dt className="text-[12.5px] text-mute">{row.term}</dt>
                      <dd className="break-words text-[14.5px] font-medium text-ink sm:text-right">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="text-[12.5px] leading-relaxed text-mute">
                  Редакция документов: {dateRu(LEGAL.updated)}. Условия оказания услуг в{" "}
                  <Link
                    href="/offer"
                    className="text-ink-soft underline decoration-line underline-offset-2 hover:decoration-accent"
                  >
                    публичной оферте
                  </Link>
                  , обработка данных: в{" "}
                  <Link
                    href="/privacy"
                    className="text-ink-soft underline decoration-line underline-offset-2 hover:decoration-accent"
                  >
                    политике
                  </Link>
                  .
                </p>
              </section>

              {/* --------------------------------------------------------------- cta */}
              <section
                aria-labelledby="contacts-cta-title"
                className="rounded-card bg-ink px-6 py-9 text-white sm:px-10 sm:py-12"
              >
                <h2
                  id="contacts-cta-title"
                  className="max-w-[26ch] text-[clamp(22px,4.2vw,34px)] font-semibold text-white"
                >
                  Рассчитать цену за минуту
                </h2>
                <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-white/70 sm:text-[15.5px]">
                  Три вопроса в калькуляторе: и вилка стоимости на экране. Если удобнее голосом, позвоните:
                  подскажем по ткани и срокам без навязывания.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/#calculator" variant="accent" icon="ruble">
                    Открыть калькулятор
                  </ButtonLink>
                  <a
                    href={BRAND.phoneHref}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-white/25 px-5 text-[15px] font-medium text-white transition-colors hover:border-white/45 hover:bg-white/5"
                  >
                    <Icon name="phone" size={17} />
                    {BRAND.phoneDisplay}
                  </a>
                </div>
              </section>

              <SectionHead eyebrow="Дальше" title="Документы и цены" className="pt-2" />
              <ul className="grid gap-3 sm:grid-cols-3">
                <li>
                  <Link
                    href="/chistka-mebeli-na-domu"
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border border-line bg-canvas px-5 py-4 text-[14.5px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-mist"
                  >
                    Химчистка мебели на дому
                    <Icon name="chevronRight" size={17} className="shrink-0 text-mute" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/offer"
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border border-line bg-canvas px-5 py-4 text-[14.5px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-mist"
                  >
                    Публичная оферта
                    <Icon name="chevronRight" size={17} className="shrink-0 text-mute" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-card border border-line bg-canvas px-5 py-4 text-[14.5px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-accent-mist"
                  >
                    Политика обработки данных
                    <Icon name="chevronRight" size={17} className="shrink-0 text-mute" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
