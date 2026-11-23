import Link from "next/link";
import { ITEMS, formatMoney, getItem, getSize } from "@/lib/pricing";
import { BRAND, FAQ, STEPS, TRUST } from "@/lib/brand";
import { publishedGallery } from "@/lib/requests";
import { Icon, IconPlate, ITEM_ICONS, type IconName } from "@/components/icons";
import { Reveal, SectionHead, Eyebrow } from "@/components/ui";
import { AnimatedNumber, Magnetic, ParallaxLayer, SmoothAccordion, Stagger } from "@/components/motion";
import { BeforeAfterSlider } from "@/components/BeforeAfter";

/**
 * Card that lifts 2px and warms its shadow - shared by the landing grids.
 * Tailwind v4 moves `-translate-y` through the `translate` property, so that is
 * what has to be in the transition list (not `transform`).
 */
const CARD_HOVER =
  "transition-[translate,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-soft";

/* -------------------------------------------------------------------------- */
/* Trust                                                                       */
/* -------------------------------------------------------------------------- */

export function Trust() {
  return (
    <section aria-label="Почему нам доверяют" className="border-y border-line bg-canvas-soft">
      <div className="page grid grid-cols-1 gap-px py-0 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t, i) => (
          <Reveal
            key={t.title}
            delay={i * 60}
            y={14}
            className="flex gap-3 border-line px-0 py-5 sm:px-5 sm:py-6 lg:border-l lg:first:border-l-0 lg:first:pl-0"
          >
            <IconPlate name={t.icon as IconName} size={19} />
            <div>
              <p className="text-[14.5px] font-semibold leading-snug">{t.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{t.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How we work                                                                 */
/* -------------------------------------------------------------------------- */

export function HowWeWork() {
  return (
    <section id="how" className="scroll-mt-20 py-14 sm:py-20">
      <div className="page">
        <SectionHead
          eyebrow="Как мы работаем"
          title="Четыре шага, и ничего лишнего"
          titleBreakAfter={2}
          sub="Вы заранее знаете, что произойдёт в вашей квартире и сколько это стоит. Мастер приезжает со своим оборудованием: от вас нужна только розетка и место на полу."
        />

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 80} y={22} className="h-full">
              <div
                className={`group relative h-full overflow-hidden rounded-[22px] border border-line bg-canvas p-4 sm:p-5 ${CARD_HOVER}`}
              >
                <Reveal
                  as="span"
                  delay={i * 80 + 190}
                  y={8}
                  scale={0.94}
                  duration={620}
                  className="pointer-events-none absolute right-2 top-0 select-none text-[54px] font-semibold leading-none tracking-tighter text-line/80"
                >
                  {s.n}
                </Reveal>
                <div className="relative">
                  <IconPlate
                    name={s.icon as IconName}
                    size={19}
                    className="transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                  />
                  <h3 className="mt-3 text-[15.5px] font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{s.text}</p>
                  <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-canvas-soft px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                    <Icon name="clock" size={12} />
                    {s.meta}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Prices                                                                     */
/* -------------------------------------------------------------------------- */

export function Prices() {
  return (
    <section id="prices" className="scroll-mt-20 bg-canvas-soft py-14 sm:py-20">
      <div className="page">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHead
            eyebrow="Цены"
            title="Понятная смета без сюрпризов"
            sub="Базовая цена: за один предмет минимального размера. Точную сумму видно в калькуляторе и фиксируем до выезда."
          />
          <Magnetic strength={4} className="self-start sm:self-auto">
            <Link
              href="#calculator"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 text-[13px] font-medium text-ink transition-colors hover:bg-canvas-soft"
            >
              Посчитать свой случай
            </Link>
          </Magnetic>
        </div>

        <div className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it, i) => (
            <Reveal key={it.key} delay={i * 60} y={20} className="h-full">
              <div
                className={`flex h-full flex-col justify-between rounded-[22px] border border-line bg-canvas p-4 sm:p-5 ${CARD_HOVER}`}
              >
                <div>
                  <Icon name={ITEM_ICONS[it.key]} size={26} className="text-accent-deep" />
                  <h3 className="mt-3 text-[16px] font-semibold">{it.label}</h3>
                  <p className="mt-1 text-[12px] leading-snug text-mute">{it.blurb}</p>
                </div>
                <p className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">
                  от{" "}
                  <AnimatedNumber value={it.base} duration={500} suffix=" ₽" label={formatMoney(it.base)} />
                </p>
                <ul className="mt-2 space-y-1">
                  {it.sizes.slice(0, 3).map((s) => (
                    <li key={s.key} className="flex justify-between text-[11.5px] text-ink-soft">
                      <span>{s.label}</span>
                      <span className="tnum">{formatMoney(Math.round(it.base * s.factor))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Results (before / after)                                                    */
/* -------------------------------------------------------------------------- */

export async function Results() {
  const gallery = await publishedGallery(3).catch(() => []);
  const demo = ["sofa", "carpet", "mattress"] as const;

  // Real client photos first; the remaining slots are filled with the
  // procedural textile demo so the row never leaves a hole in the layout.
  const cards = [
    ...gallery.map((g) => ({
      item: g.item,
      label: `${getItem(g.item).label}, ${getSize(g.item, g.size).label.toLowerCase()}`,
      beforeSrc: g.before ? `/api/media/${g.before.id}` : undefined,
      afterSrc: g.after ? `/api/media/${g.after.id}` : undefined,
      isReal: Boolean(g.before && g.after),
    })),
    ...demo.slice(0, Math.max(0, 3 - gallery.length)).map((item) => ({
      item,
      label: `${getItem(item).label}, ${getSize(item, "medium").label.toLowerCase()}`,
      beforeSrc: undefined,
      afterSrc: undefined,
      isReal: false,
    })),
  ];

  return (
    <section id="results" className="scroll-mt-20 py-14 sm:py-20">
      <div className="page">
        <SectionHead
          eyebrow="До и после"
          title="Разница, которую видно на фото"
          sub="Потяните ползунок. Все фото: с реальных заявок, публикуем только с согласия клиента; если фото нет, показываем демонстрацию на образце ткани."
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={`${c.item}-${i}`} delay={i * 70} y={20}>
              <figure className="overflow-hidden rounded-[22px] border border-line bg-canvas">
                <BeforeAfterSlider item={c.item} beforeSrc={c.beforeSrc} afterSrc={c.afterSrc} />
                <figcaption className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <span className="truncate text-[12.5px] font-medium text-ink">{c.label}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-accent-deep">
                    <Icon name="photo" size={12} />
                    {c.isReal ? "реальная заявка" : "демонстрация"}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export function Reviews() {
  // No invented social proof (R-17/R-18): this slot ships empty and labelled.
  // The buyer fills it from Yandex Maps / Avito, or the owner pastes reviews in
  // the cabinet. Showing the frame is useful; showing fake people is not.
  return (
    <section aria-labelledby="reviews-title" className="bg-canvas-soft py-14 sm:py-20">
      <div className="page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal as="span" y={8} duration={520} className="inline-block">
              <Eyebrow>Отзывы</Eyebrow>
            </Reveal>
            <h2 id="reviews-title" className="mt-2.5 text-[clamp(26px,5.4vw,44px)] font-semibold">
              Отзывы клиентов
            </h2>
            <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-ink-soft">
              Блок готов к подключению: отзывы подтягиваются с Яндекс Карт и Авито или загружаются в кабинете.
              В демо карточки пустые, чтобы вы видели разметку и не читали выдуманные истории.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-[12px] font-medium text-mute">
            <Icon name="refresh" size={13} />
            подключается к источнику
          </span>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 70} y={20} className="h-full">
              <figure className="flex h-full flex-col justify-between rounded-[22px] border border-dashed border-line bg-canvas p-4 sm:p-5">
                <div className="space-y-2">
                  <span className="block h-2.5 w-[92%] rounded-full bg-line-soft" />
                  <span className="block h-2.5 w-[78%] rounded-full bg-line-soft" />
                  <span className="block h-2.5 w-[54%] rounded-full bg-line-soft" />
                </div>
                <figcaption className="mt-4 flex items-center gap-2.5 border-t border-line pt-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-canvas-soft text-[11px] font-medium text-mute">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink-soft">[ИМЯ, РАЙОН]</p>
                    <p className="truncate text-[11px] text-mute">[УСЛУГА, ДАТА]</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-20 py-14 sm:py-20">
      <div className="page grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <SectionHead
            eyebrow="Вопросы"
            title="Отвечаем заранее"
            sub="Если чего-то нет в списке: позвоните, ответим без скриптов."
          />
          <a
            href={BRAND.phoneHref}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-canvas-soft"
          >
            <Icon name="phone" size={16} className="text-accent-deep" />
            {BRAND.phoneDisplay}
          </a>
        </div>

        <div className="lg:col-span-8">
          <SmoothAccordion
            idPrefix="faq"
            className="overflow-hidden rounded-[22px] border border-line bg-canvas"
            itemClassName="px-4 sm:px-5"
            items={FAQ.map((f, index) => ({ id: `q${index + 1}`, question: f.q, answer: f.a }))}
          />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

export function CtaBlock() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="page">
        <div className="relative overflow-hidden rounded-[30px] bg-ink px-5 py-9 text-white sm:px-10 sm:py-12">
          <ParallaxLayer
            distance={12}
            className="pointer-events-none absolute -inset-4 will-change-transform"
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(60% 100% at 78% 10%, rgba(15,182,166,.35), transparent 62%), radial-gradient(50% 80% at 12% 90%, rgba(243,238,230,.16), transparent 60%)",
              }}
            />
          </ParallaxLayer>
          <div className="relative max-w-[54ch]">
            <p className="text-[13px] font-medium text-accent">Свободные окна на сегодня</p>
            <h2 className="mt-3 text-[clamp(26px,5.6vw,42px)] font-semibold leading-[1.06]">
              Считаем цену за минуту.
              <br />
              Приезжаем в тот же день.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              Три вопроса, вилка цены и код заявки. Оплата: только после того, как примете работу.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Magnetic strength={4} className="w-full sm:w-auto">
                <Link
                  href="#calculator"
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-ink shadow-[inset_0_-1px_0_rgba(20,22,26,.08)] transition-transform duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] sm:w-auto"
                >
                  Рассчитать стоимость
                  <span
                    aria-hidden
                    className="inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <Icon name="arrowRight" size={17} />
                  </span>
                </Link>
              </Magnetic>
              <a
                href={BRAND.phoneHref}
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/10"
              >
                <Icon name="phone" size={17} />
                {BRAND.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
