import type { Metadata } from "next";
import Link from "next/link";

import { Icon, IconPlate } from "@/components/icons";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { CaseFaq } from "@/components/case/CaseFaq";
import { CaseFooter } from "@/components/case/CaseFooter";
import { CaseHeader } from "@/components/case/CaseHeader";
import { CaseSection } from "@/components/case/CaseSection";
import { Screenshot } from "@/components/case/Screenshot";
import { TierCards } from "@/components/case/TierCards";
import { BRAND } from "@/lib/brand";
import {
  CASE_FEATURES,
  CASE_GALLERY_BIG,
  CASE_GALLERY_STRIP,
  CASE_META,
  CASE_METRICS,
  CASE_PATH_SUMMARY,
  CASE_PRICING_NOTE,
  CASE_SECURITY_CHECKS,
  CASE_SHOT_HERO,
  CASE_SHOT_SEO,
  CASE_SHOT_TRACKING,
  CASE_SPECS,
  CASE_STEPS,
  CASE_TECH_FACTS,
} from "@/lib/case";

export const metadata: Metadata = {
  // absolute: the title already carries "демо Лоск", the root template would
  // append " · Лоск" and duplicate the brand.
  title: { absolute: CASE_META.title },
  description: CASE_META.description,
  alternates: { canonical: CASE_META.path },
  // Service page for sales conversations, not a search landing.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: BRAND.name,
    url: CASE_META.path,
    title: CASE_META.title,
    description: CASE_META.description,
    images: [
      {
        url: CASE_META.ogImage,
        width: 1200,
        height: 630,
        alt: "Демо-проект «Лоск», сайт химчистки с калькулятором и кабинетом",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: CASE_META.title,
    description: CASE_META.description,
    images: [CASE_META.ogImage],
  },
};

// Fully static: the page is prerendered once and served as HTML.
export const dynamic = "force-static";

export default function CasePage() {
  return (
    <>
      <CaseHeader />
      <main id="main">
        {/* ------------------------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden border-b border-line bg-canvas">
          <div aria-hidden className="aurora" />
          <div className="page relative py-9 sm:py-12 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-end lg:gap-14">
              <div>
                <Eyebrow>демо-проект</Eyebrow>
                <h1 className="mt-3.5 max-w-[24ch] text-[clamp(29px,6vw,54px)] font-semibold text-ink">
                  Сайт для химчистки, который доводит клиента до оплаты
                </h1>
                <p className="mt-5 max-w-[56ch] text-[15.5px] leading-relaxed text-ink-soft sm:text-[17.5px]">
                  «Лоск»: не макет и не презентация. Квиз считает цену, заявка получает код, смета согласуется
                  в кабинете, оплата проходит картой. Ниже: что владелец получает каждый день, чем это
                  проверено и из чего собрать такой сайт.
                </p>

                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <ButtonLink href="/" size="lg" iconRight="arrowRight">
                    Открыть демо
                  </ButtonLink>
                  <ButtonLink href="/admin/login" size="lg" variant="soft" icon="dashboard">
                    Смотреть кабинет владельца
                  </ButtonLink>
                </div>
                <p className="mt-3 max-w-[56ch] text-[12px] leading-relaxed text-mute">
                  Кабинет открывается одной кнопкой на странице входа: можно пройти весь путь и сбросить
                  демо-данные. Имена и телефоны в заявках вымышлены; реальная система ставится на ваш домен и
                  пустую базу.
                </p>
              </div>

              <Screenshot shot={CASE_SHOT_HERO} frame="desktop" eager />
            </div>

            <ul
              aria-label="Проверенные метрики демо"
              className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:mt-12 sm:grid-cols-3 lg:grid-cols-6"
            >
              {CASE_METRICS.map((metric) => (
                <li key={metric.label} className="bg-canvas px-4 py-3.5">
                  <span className="font-mono text-[10px] leading-relaxed tracking-[0.01em] text-mute">
                    {metric.label}
                  </span>
                  <span className="tnum mt-1 block font-mono text-[23px] font-semibold leading-none text-ink">
                    {metric.value}
                  </span>
                  <span className="mt-1.5 block text-[10.5px] leading-snug text-mute">{metric.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* --------------------------------------------------------- features */}
        <CaseSection
          id="features"
          index="01"
          rail="возможности"
          eyebrow="не витрина"
          title="Что получает владелец"
          sub="Сайт: это не витрина, а рабочий инструмент. Шесть вещей ниже владелец делает каждый день: принимает заявки, согласует цены, показывает результат и получает деньги."
        >
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CASE_FEATURES.map((feature) => (
              <article key={feature.title} className="bg-canvas p-5 sm:p-6">
                <IconPlate name={feature.icon} size={20} />
                <h3 className="mt-4 text-[16.5px] font-semibold leading-snug text-ink">{feature.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{feature.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-mute">
            Все шесть пунктов работают в одном демо: без «модулей в разработке» и заглушек. Проверить можно
            сразу: пройдите квиз, получите код заявки и откройте её в отслеживании.
          </p>
        </CaseSection>

        {/* ---------------------------------------------------------- gallery */}
        <CaseSection
          id="gallery"
          index="02"
          rail="скриншоты"
          eyebrow="интерфейс"
          title="Как это выглядит вживую"
          sub="Скриншоты сняты на работающем демо, без рендеров и мокапов. Телефонные экраны: 390 px, десктопные: 1440 px."
          tone="soft"
        >
          <div className="grid gap-8 sm:grid-cols-2 sm:items-start sm:gap-6 lg:gap-10">
            {CASE_GALLERY_BIG.map((shot) => (
              <Screenshot key={shot.src} shot={shot} frame="phone" />
            ))}
          </div>

          <div className="mt-10 grid gap-8 rounded-card border border-line bg-canvas p-5 sm:mt-12 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-center lg:gap-12">
            <div>
              <h3 className="text-[clamp(20px,3.4vw,28px)] font-semibold text-ink">
                Клиент не звонит «что по заявке»
              </h3>
              <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft sm:text-[15.5px]">
                Код заявки открывает страницу отслеживания: статус, смета, фото до и после, ссылка на оплату.
                Всё в одном месте: без регистрации, пароля и переписки с мастером.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Статус меняется из кабинета: клиент видит его сразу",
                  "Согласование цены фиксируется в заявке",
                  "Фото до и после остаются у клиента",
                  "Оплата: по ссылке из той же страницы",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-soft"
                  >
                    <Icon
                      name="check"
                      size={15}
                      strokeWidth={2.2}
                      className="mt-[3px] shrink-0 text-accent-deep"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <Screenshot shot={CASE_SHOT_TRACKING} frame="phone" crop />
          </div>

          <ul
            aria-label="Остальные экраны демо"
            className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 lg:grid-cols-3 lg:gap-5"
          >
            {CASE_GALLERY_STRIP.map((shot) => (
              <li key={shot.src}>
                <Screenshot shot={shot} crop />
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[74ch] text-[12px] leading-relaxed text-mute">
            Телефонные экраны в нижнем ряду показаны фрагментом: полные скриншоты длиннее карточки.
          </p>

          <div className="mt-6 sm:mt-8">
            <Screenshot shot={CASE_SHOT_SEO} frame="desktop" />
          </div>
        </CaseSection>

        {/* ------------------------------------------------------------- path */}
        <CaseSection
          id="path"
          index="03"
          rail="сценарий"
          eyebrow="от заявки до денег"
          title="Путь клиента: от квиза до оплаты"
          sub="Пять шагов, один код заявки. Ничего не теряется в переписке: цена, фото и платёж привязаны к заявке."
        >
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CASE_STEPS.map((step) => (
              <li
                key={step.n}
                className="flex h-full flex-col rounded-2xl border border-line bg-canvas p-4 sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] font-medium text-accent-deep">{step.n}</span>
                  <span className="text-right font-mono text-[10px] leading-snug tracking-[0.01em] text-mute">
                    {step.time}
                  </span>
                </div>
                <h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-ink">{step.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-col gap-1.5 rounded-2xl border border-line bg-canvas-soft px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-mono text-[10px] tracking-[0.01em] text-mute">сквозной путь</span>
            <span className="font-mono text-[12px] leading-relaxed text-ink">{CASE_PATH_SUMMARY}</span>
          </div>
        </CaseSection>

        {/* ------------------------------------------------------------- tech */}
        <CaseSection
          id="tech"
          index="04"
          rail="стек и проверки"
          eyebrow="техническая часть"
          title="Что внутри"
          sub="Это стоит прочитать, если вы выбираете подрядчика и хотите понимать, за что платите. Без «современных технологий»: конкретные вещи, которые можно проверить."
          tone="soft"
        >
          <ul aria-label="Цифры проекта" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CASE_TECH_FACTS.map((fact) => (
              <li key={fact.label} className="rounded-2xl border border-line bg-canvas px-4 py-3.5">
                <span className="tnum block font-mono text-[22px] font-semibold leading-none text-ink">
                  {fact.value}
                </span>
                <span className="mt-1.5 block text-[12px] font-medium text-ink">{fact.label}</span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-mute">{fact.hint}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 overflow-hidden rounded-card border border-line bg-canvas">
            {CASE_SPECS.map((spec) => (
              <div
                key={spec.term}
                className="grid gap-1.5 border-t border-line px-5 py-4 first:border-t-0 sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-6 sm:px-6 sm:py-5"
              >
                <dt className="break-words font-mono text-[12px] font-medium leading-relaxed text-accent-deep">
                  {spec.term}
                </dt>
                <dd className="text-[13.5px] leading-relaxed text-ink-soft">{spec.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-card border border-line bg-canvas p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[17px] font-semibold text-ink">Безопасность: 64 из 64</h3>
              <span className="font-mono text-[11px] text-mute">
                собственный пентест · 0 провалов · 0 критичных
              </span>
            </div>
            <p className="mt-2 max-w-[74ch] text-[13px] leading-relaxed text-ink-soft">
              Проверяли не «на глаз»: подбор пароля, доступ к чужим заявкам, подмену цены в запросе, загрузку
              под видом картинки и повторный вебхук. Ниже: категории, которые закрыты в коде.
            </p>
            <ul aria-label="Проверенные категории безопасности" className="mt-4 flex flex-wrap gap-1.5">
              {CASE_SECURITY_CHECKS.map((check) => (
                <li
                  key={check}
                  className="rounded-full border border-line bg-canvas-soft px-2.5 py-1 font-mono text-[11px] leading-snug text-ink-soft"
                >
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </CaseSection>

        {/* ---------------------------------------------------------- pricing */}
        <CaseSection
          id="pricing"
          index="05"
          rail="три уровня"
          eyebrow="стоимость"
          title="Тарифы"
          sub="Три уровня: от посадочной страницы до системы под ключ. Цены зависят от города и объёма, поэтому обсуждаем их на созвоне, а не показываем цифру, которая потом «уточнится»."
        >
          <TierCards />
          <p className="mt-4 max-w-[86ch] text-[12.5px] leading-relaxed text-mute">{CASE_PRICING_NOTE}</p>
        </CaseSection>

        {/* -------------------------------------------------------------- faq */}
        <CaseSection
          id="faq"
          index="06"
          rail="перед стартом"
          eyebrow="покупателю"
          title="Вопросы покупателя"
          sub="То, что спрашивают до начала работы,: без маркетинговых ответов."
          tone="soft"
        >
          <CaseFaq />
        </CaseSection>

        {/* ---------------------------------------------------------- contact */}
        <section id="contact" aria-labelledby="contact-title" className="page py-12 sm:py-16">
          <div className="relative isolate overflow-hidden rounded-card bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-accent/25 blur-3xl"
            />
            <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start lg:gap-12">
              <div>
                <span className="font-mono text-[10.5px] tracking-[0.01em] text-accent-soft">связь</span>
                <h2
                  id="contact-title"
                  className="mt-3 max-w-[22ch] text-[clamp(24px,4.6vw,40px)] font-semibold text-white"
                >
                  Покажу демо и назову цену
                </h2>
                <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-white/70 sm:text-[16px]">
                  Двадцать минут на созвон: разбираем, как у вас приходят заявки, что из системы действительно
                  нужно, а что можно не делать. После созвона: смета с этапами, сроками и суммой.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  <ButtonLink
                    href={BRAND.telegram}
                    variant="accent"
                    size="lg"
                    icon="message"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Написать в Telegram
                  </ButtonLink>
                  <a
                    href={BRAND.phoneHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-white/25 px-5 text-[15px] font-medium text-white transition-colors hover:border-white/45 hover:bg-white/5"
                  >
                    <Icon name="phone" size={16} />
                    {BRAND.phoneDisplay}
                  </a>
                  <a
                    href={`mailto:${BRAND.email}`}
                    className="inline-flex min-h-11 items-center rounded-pill px-4 text-[14px] text-white/75 transition-colors hover:text-white"
                  >
                    {BRAND.email}
                  </a>
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-white/55">
                  {BRAND.hours} · {BRAND.region}
                </p>
              </div>

              <aside
                aria-label="Что будет на созвоне"
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-5"
              >
                <p className="font-mono text-[10.5px] tracking-[0.01em] text-accent-soft">на созвоне</p>
                <ol className="mt-4 space-y-3 text-[13px] leading-snug text-white/80">
                  <li>1. Разберём поток заявок и места, где теряются клиенты.</li>
                  <li>2. Соберём состав системы под ваш случай.</li>
                  <li>3. Назову срок и сумму: без «от».</li>
                </ol>
                <Link
                  href="/case/print"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-accent-soft underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/60"
                >
                  One-pager для печати (A4, PDF)
                  <Icon name="arrowRight" size={15} />
                </Link>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <CaseFooter />
    </>
  );
}
