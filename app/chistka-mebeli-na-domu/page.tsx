import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, IconPlate, ITEM_ICONS } from "@/components/icons";
import { Nav, StickyCta } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ButtonLink, Eyebrow, SectionHead } from "@/components/ui";
import { BRAND, FAQ, SEO_KEYWORDS, STEPS } from "@/lib/brand";
import { dateRu, LEGAL, safeJsonLd } from "@/lib/legal";
import { formatMoney, ITEMS } from "@/lib/pricing";
import type { ItemKey } from "@/lib/types";

const PATH = "/chistka-mebeli-na-domu";

const TITLE = "Химчистка мебели на дому в Москве: цены и калькулятор | Лоск";
const DESCRIPTION =
  "Химчистка мебели на дому в Москве: диван от 2 400 ₽, кресло от 1 200 ₽, ковёр от 1 500 ₽, матрас от 1 800 ₽. Выезд в день заявки, гарантия 48 часов.";

export const metadata: Metadata = {
  // absolute: the title already carries the brand, and the root layout would
  // otherwise append " · Лоск" and duplicate it.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: Array.from(
    new Set([
      ...SEO_KEYWORDS,
      "химчистка мебели на дому москва",
      "чистка дивана на дому",
      "чистка ковра на дому",
      "чистка матраса от пыли и клещей",
      "химчистка мягкой мебели",
      "сколько сохнет диван после химчистки",
      "цены на химчистку мебели",
    ]),
  ),
  alternates: { canonical: PATH },
  openGraph: {
    type: "article",
    locale: "ru_RU",
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Лоск, химчистка мебели на дому в Москве",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${BRAND.site}${PATH}#service`,
  name: "Химчистка мебели на дому в Москве",
  serviceType: "Химчистка мягкой мебели, ковров и матрасов на дому",
  description: DESCRIPTION,
  areaServed: { "@type": "City", name: BRAND.city },
  termsOfService: `${BRAND.site}/offer`,
  provider: {
    "@type": "LocalBusiness",
    "@id": `${BRAND.site}/#business`,
    name: BRAND.name,
    legalName: BRAND.legal,
    url: BRAND.site,
    telephone: BRAND.phoneDisplay,
    email: BRAND.email,
    priceRange: "₽₽",
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND.address,
      addressLocality: BRAND.city,
      addressCountry: "RU",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAYS,
        opens: "08:00",
        closes: "22:00",
      },
    ],
  },
  offers: ITEMS.map((item) => ({
    "@type": "Offer",
    name: `Химчистка: ${item.label.toLowerCase()}`,
    description: `${item.blurb}. ${item.sizes.map((size) => size.label).join(", ")}.`,
    price: String(item.base),
    priceCurrency: "RUB",
    availability: "https://schema.org/InStock",
    url: `${BRAND.site}${PATH}`,
    itemOffered: { "@type": "Service", name: item.label },
  })),
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((entry) => ({
    "@type": "Question",
    name: entry.q,
    acceptedAnswer: { "@type": "Answer", text: entry.a },
  })),
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Главная",
      item: `${BRAND.site}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Химчистка мебели на дому",
      item: `${BRAND.site}${PATH}`,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

/** What the price actually covers, per item. */
const INCLUDED: Record<ItemKey, string> = {
  sofa: "Обивка, подушки, подлокотники и каркас. Тест ткани перед началом, контроль влажности в конце.",
  carpet: "Ворс и основание, бахрома по запросу. Без залива пола, сушка на месте.",
  mattress: "Две стороны, швы и боковины. Антиаллергенная обработка против пыли и клещей.",
  other: "Кресла, стулья, пуфы, шторы. Отдельный режим под ткань и высоту ворса.",
};

const FACTS = [
  { term: "Выезд", value: "в день заявки" },
  { term: "График", value: BRAND.hours },
  { term: "Гарантия", value: "48 часов на результат" },
];

const MASTER_BRINGS = [
  "Экстрактор и профессиональные составы",
  "Плёнку на пол и защиту стен",
  "Контроль влажности после чистки",
  "Чек и код заявки для гарантии",
];

const LINKS = [
  { href: "/", label: "Главная", note: "Услуги, до / после, порядок работы" },
  {
    href: "/#calculator",
    label: "Калькулятор стоимости",
    note: "Цена по типу мебели, размеру и загрязнениям",
  },
  { href: "/offer", label: "Публичная оферта", note: "Стоимость, оплата, гарантия 48 часов" },
  { href: "/privacy", label: "Политика обработки данных", note: "Что мы храним и как это удалить" },
  { href: "/contacts", label: "Контакты и реквизиты", note: "Телефон, почта, районы выезда" },
];

const EDITORIAL: {
  id: string;
  title: string;
  body: ReactNode;
}[] = [
  {
    id: "pochemu-pachkaetsya",
    title: "Почему мебель пачкается быстрее, чем кажется",
    body: (
      <>
        <p>
          Обивка: это пористая структура, а не гладкая поверхность. Пыль оседает на ворсе, связывается с
          кожным жиром и постепенно уходит вглубь, к наполнителю. Поэтому диван, который «выглядит нормально»,
          на глубине 2–4 см может держать плотный слой пыли, частицы косметики и крема.
        </p>
        <p>
          Второй фактор: жир. Ладони и предплечья касаются подлокотников каждый день, и на ткани остаётся
          тонкая жировая плёнка. Она работает как ловушка: пыль липнет к ней и не снимается обычным пылесосом,
          нужна именно вымывающая чистка, которая растворяет жир и уносит его с водой.
        </p>
        <p>
          Третий: ультрафиолет. Солнце окисляет жир и органические пятна, и со временем они «запекаются»:
          пятну в месяц выводить заметно сложнее, чем свежему, а светлая обивка у окон уходит в жёлтый
          оттенок. Плюс у многих тканей заводская водоотталкивающая пропитка стирается за один-два года, и
          мебель начинает впитывать жидкость сразу, а не собирать её на поверхности.
        </p>
      </>
    ),
  },
  {
    id: "extractor-vs-washer",
    title: "Чем экстракторная чистка отличается от моющей пылесосной",
    body: (
      <>
        <p>
          Бытовая моющая машина подаёт раствор и тут же всасывает его обратно, но вакуум у неё слабее, а щётка
          рассчитана на небольшой расход воды. Часть раствора остаётся в поролоне. Внешне обивка сухая,
          внутри: влажный наполнитель, который несколько дней отдаёт запах и может дать усадку.
        </p>
        <p>
          Экстрактор: профессиональная машина, где подача и отбор воды сбалансированы: раствор идёт под
          давлением, сразу вымывается вместе с грязью, а вакуум вытягивает до 90% влаги. Наполнитель остаётся
          чуть влажным, поэтому обивка сохнет 2–4 часа, а не сутки.
        </p>
        <p>
          Разница видна и в деталях: давление подбирается под тип ткани, для ворса и швов есть разные насадки,
          состав идёт с контролем pH, а перед началом мастер делает тест на незаметном участке. Грязь не
          размазывается по площади, а уходит в бак. С ковром то же правило: чистим без залива пола и без
          «мокрого пятна» под ковром.
        </p>
      </>
    ),
  },
  {
    id: "tkani-kotorye-ne-chistim",
    title: "Какие ткани мы не чистим и почему",
    body: (
      <>
        <p>Мы не берём в работу несколько категорий: и говорим об этом заранее, а не после чистки.</p>
        <p>
          Натуральный шёлк. Вода оставляет на нём кольца и меняет блеск, а белок волокна плохо переносит
          щелочные составы. Такой текстиль чистится только в цеху, в растворителе, поэтому на дому мы от него
          отказываемся и предлагаем обратиться в специализированную химчистку.
        </p>
        <p>
          Велюр и плюш с ворсом выше 4 мм. Ворс сваливается под щёткой и заминается, особенно на подлокотниках
          и сиденье. Если нет возможности сделать тест на скрытом участке: например, на задней части каркаса,:
          мы не начинаем работу: риск получить полосы выше пользы от чистки.
        </p>
        <p>
          Кожа и экокожа: отдельный разговор. Вода и щёлочь снимают с кожи защитный жировой слой, после чего
          она грубеет и трескается. Кожу мы чистим только составами для кожи и с последующей обработкой
          кондиционером, а потрескавшуюся поверхность отправляем к реставратору.
        </p>
        <p>
          Ещё несколько случаев: гобелен и парча, антикварная обивка на клею, ткани с неустойчивым красителем
          и маркировкой «только сухая чистка». Тест занимает 15 минут. Если реакция сомнительная, мы просто не
          берём заказ, и ничего за тест не берём.
        </p>
      </>
    ),
  },
  {
    id: "skolko-sohnet",
    title: "Сколько сохнет и как ускорить",
    body: (
      <>
        <p>
          Средняя обивка сохнет 2–4 часа. Плотный велюр и шенилл: до 6 часов, ковёр с высоким ворсом: 3–6,
          матрас после двусторонней чистки: 4–8: влага уходит из наполнителя медленнее, чем с поверхности.
          Если в квартире влажно и нет сквозняка, ориентируйтесь на верхнюю границу диапазона.
        </p>
        <p>Что действительно помогает:</p>
        <ul>
          <li>открытые окна и обычный сквозняк: испарение важнее, чем нагрев;</li>
          <li>снятые подушки, поставленные на ребро;</li>
          <li>вентилятор на минимальной скорости, направленный в сторону, а не в обивку.</li>
        </ul>
        <p>
          Что не помогает и иногда вредит: обогреватель и фен. Горячий воздух быстро сушит верхний слой, но
          «запирает» влагу внутри наполнителя, отсюда запах сырости и деформация. Не стоит ставить мебель
          обратно на ковёр, пока он влажный: подложка под прессом запревает.
        </p>
        <p>
          Готовность проверяйте на ощупь в глубине шва, а не по кромке: кромка сохнет первой и обманывает.
        </p>
      </>
    ),
  },
  {
    id: "posle-chistki",
    title: "Что делать после чистки: первые два часа",
    body: (
      <>
        <p>
          В первые два часа обивка ещё «схватывается»: волокна расправляются, состав продолжает работать. В
          это время:
        </p>
        <ul>
          <li>не садитесь и не ставьте на мебель тяжёлое: пауза минимум 2 часа, лучше 4;</li>
          <li>снимите подушки и поставьте их на ребро, чтобы воздух прошёл со всех сторон;</li>
          <li>откройте окна на микропроветривание, без сквозняка прямо на мебель;</li>
          <li>держите детей и животных подальше от влажной обивки: мокрая ткань охотно впитывает шерсть;</li>
          <li>не вытирайте влагу полотенцем: оно втирает ворс и оставляет заломы;</li>
          <li>не включайте обогреватель и не сушите феном.</li>
        </ul>
        <p>
          Через 4–6 часов посмотрите на поверхность при дневном свете. Если видны кольца от высыхания или
          пятно осталось, напишите или позвоните: по гарантии мы перечистим бесплатно в течение 48 часов. Если
          после перечистки результат прежний: вернём стоимость этой позиции по заявке.
        </p>
      </>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[70ch] space-y-4 text-[15px] leading-[1.75] text-ink-soft [&_li]:leading-[1.7] [&_p]:text-pretty [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 sm:text-[16.5px]">
      {children}
    </div>
  );
}

export const dynamic = "force-static";

export default function ChistkaMebeliNaDomuPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <Nav />
      <main id="main">
        {/* ---------------------------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden border-b border-line bg-canvas">
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
                  Химчистка мебели на дому
                </li>
              </ol>
            </nav>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-14">
              <div>
                <Eyebrow>Химчистка на дому · {BRAND.city}</Eyebrow>
                <h1 className="mt-3.5 max-w-[26ch] text-[clamp(29px,6.1vw,52px)] font-semibold text-ink">
                  Химчистка мебели на дому в Москве: без выноса и без запаха
                </h1>
                <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-soft sm:text-[17.5px]">
                  Приезжаем с профессиональным экстрактором и чистим диваны, кресла, ковры и матрасы прямо в
                  квартире. Цену фиксируем в заявке до начала работ, выезд: в день обращения. Составы без
                  хлора, запах выветривается за 1–2 часа.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/#calculator" size="lg" icon="ruble">
                    Рассчитать цену за минуту
                  </ButtonLink>
                  <ButtonLink href={BRAND.phoneHref} size="lg" variant="soft" icon="phone">
                    {BRAND.phoneDisplay}
                  </ButtonLink>
                </div>

                <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {FACTS.map((fact) => (
                    <div key={fact.term} className="rounded-2xl border border-line bg-canvas/80 px-4 py-3">
                      <dt className="text-[11.5px] font-semibold tracking-[0.01em] text-mute">{fact.term}</dt>
                      <dd className="mt-1 text-[14px] font-medium text-ink">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <aside
                aria-label="Что мастер привозит с собой"
                className="rounded-card border border-line bg-canvas p-5 shadow-soft sm:p-6"
              >
                <p className="text-[11.5px] font-semibold tracking-[0.01em] text-accent-deep">
                  С собой привозим
                </p>
                <ul className="mt-4 space-y-3.5">
                  {MASTER_BRINGS.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-[14px] leading-snug text-ink-soft">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-deep" />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-mute">
                  Тест ткани на незаметном участке: до начала работ. Если ткань не подходит для чистки на
                  дому, скажем сразу и ничего не возьмём.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- prices */}
        <section id="ceny" className="bg-canvas-soft py-16 sm:py-24">
          <div className="page">
            <SectionHead
              eyebrow="Цены"
              title="Сколько стоит химчистка мебели на дому"
              sub="Базовые цены за одну единицу. Итог зависит от размера, ткани и характера загрязнений: вилку считает калькулятор, а точную сумму мы фиксируем в заявке до выезда."
            />

            <div className="mt-9 overflow-hidden rounded-card border border-line bg-canvas shadow-soft">
              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Таблица цен на химчистку мебели, ковров и матрасов"
                tabIndex={0}
              >
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <caption className="caption-top border-b border-line px-5 py-4 text-left text-[12.5px] leading-relaxed text-mute sm:px-6">
                    Цены за одну единицу: Москва и ближнее Подмосковье.
                  </caption>
                  <thead>
                    <tr className="bg-canvas-soft text-[11.5px] font-semibold tracking-[0.01em] text-mute">
                      <th scope="col" className="px-5 py-3.5 sm:px-6">
                        Услуга
                      </th>
                      <th scope="col" className="px-5 py-3.5 sm:px-6">
                        Что входит
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right sm:px-6">
                        Цена от
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ITEMS.map((item) => (
                      <tr key={item.key} className="border-t border-line align-top">
                        <th scope="row" className="px-5 py-5 text-left font-normal sm:px-6">
                          <span className="flex items-start gap-3">
                            <IconPlate name={ITEM_ICONS[item.key]} size={18} />
                            <span>
                              <span className="block text-[15px] font-medium text-ink">{item.label}</span>
                              <span className="mt-1 block text-[12px] leading-snug text-mute">
                                {item.sizes.map((size) => size.label).join(" · ")}
                              </span>
                            </span>
                          </span>
                        </th>
                        <td className="px-5 py-5 text-[13.5px] leading-relaxed text-ink-soft sm:px-6">
                          {INCLUDED[item.key]}
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 text-right sm:px-6">
                          <span className="tnum text-[16px] font-semibold text-ink">
                            от {formatMoney(item.base)}
                          </span>
                          <span className="mt-1 block text-[11.5px] text-mute">
                            {item.durationMin} мин работы
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-3 text-[12px] text-mute sm:hidden">Таблицу можно прокрутить по горизонтали.</p>

            <p className="mt-4 max-w-[80ch] text-[12.5px] leading-relaxed text-mute">
              Сложные загрязнения: жир, вино, запах, следы животного: добавляют 30% к стоимости позиции, пара
              свежих пятен: 12%. Срочный выезд «сегодня-завтра»: 20%, гибкая дата по договорённости: скидка
              7%. От двух предметов: скидка 10%, от трёх: 15%. Надбавки согласуем до начала работ.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------------- steps */}
        <section id="kak-prohodit" className="border-b border-line bg-canvas py-16 sm:py-24">
          <div className="page">
            <SectionHead
              eyebrow="Порядок работы"
              title="Как проходит чистка"
              sub="Четыре шага, без сюрпризов. Мебель остаётся на месте: мастер работает при вас и увозит только грязную воду."
            />

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="flex h-full flex-col rounded-card border border-line bg-canvas p-5 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <IconPlate name={step.icon} size={20} />
                    <span className="tnum text-[12px] font-semibold text-mute">{step.n}</span>
                  </div>
                  <h3 className="mt-4 text-[16.5px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-soft">{step.text}</p>
                  <p className="mt-4 border-t border-line pt-3 text-[12px] font-medium text-accent-deep">
                    {step.meta}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ editorial */}
        <div className="bg-canvas py-16 sm:py-24">
          <div className="page space-y-14 sm:space-y-16">
            {EDITORIAL.map((block, index) => (
              <article
                key={block.id}
                id={block.id}
                className={`grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-12 ${
                  index === 0 ? "" : "border-t border-line pt-10 sm:pt-14"
                }`}
              >
                <h2 className="text-[clamp(20px,3.2vw,27px)] font-semibold leading-tight text-ink lg:sticky lg:top-24">
                  {block.title}
                </h2>
                <Prose>{block.body}</Prose>
              </article>
            ))}
          </div>
        </div>

        {/* ----------------------------------------------------------------- faq */}
        <section id="faq" className="border-y border-line bg-canvas-soft py-16 sm:py-24">
          <div className="page">
            <SectionHead
              eyebrow="Вопросы"
              title="Частые вопросы"
              sub="Коротко о том, что чаще всего уточняют до заказа."
            />

            <div className="mt-9 divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">
              {FAQ.map((entry) => (
                <details key={entry.q} className="group px-5 sm:px-7">
                  <summary className="flex min-h-[64px] cursor-pointer list-none items-start justify-between gap-5 py-5 text-[15.5px] font-medium leading-snug text-ink sm:text-[17px] [&::-webkit-details-marker]:hidden">
                    <span>{entry.q}</span>
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-transform duration-200 group-open:rotate-45"
                    >
                      <Icon name="plus" size={13} />
                    </span>
                  </summary>
                  <p className="max-w-[74ch] pb-6 pr-7 text-[14px] leading-relaxed text-ink-soft sm:text-[15.5px]">
                    {entry.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------- links */}
        <section className="bg-canvas py-16 sm:py-24">
          <div className="page">
            <SectionHead eyebrow="Дальше" title="Полезные страницы" />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex min-h-[64px] items-center justify-between gap-4 rounded-card border border-line bg-canvas px-5 py-4 transition-colors hover:border-accent/40 hover:bg-accent-mist"
                  >
                    <span>
                      <span className="block text-[15px] font-medium text-ink">{link.label}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-mute">{link.note}</span>
                    </span>
                    <Icon
                      name="arrowRight"
                      size={18}
                      className="shrink-0 text-mute transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-deep"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------------------- cta */}
        <section aria-labelledby="cta-title" className="page pb-16 sm:pb-24">
          <div className="relative isolate overflow-hidden rounded-card bg-ink px-6 py-11 text-white sm:px-12 sm:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/25 blur-3xl"
            />
            <div className="relative">
              <span className="text-[11.5px] font-semibold tracking-[0.01em] text-accent-soft">
                Калькулятор
              </span>
              <h2
                id="cta-title"
                className="mt-3 max-w-[26ch] text-[clamp(24px,4.6vw,38px)] font-semibold text-white"
              >
                Рассчитать цену за минуту
              </h2>
              <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-white/70 sm:text-[16px]">
                Три вопроса: тип мебели, размер и загрязнения. Сразу видно вилку, звонок не нужен. Если
                удобнее голосом, мастер ответит на звонок ежедневно с 8:00 до 22:00.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href="/#calculator" variant="accent" size="lg" icon="ruble">
                  Открыть калькулятор
                </ButtonLink>
                <a
                  href={BRAND.phoneHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-white/25 px-6 text-[15px] font-medium text-white transition-colors hover:border-white/45 hover:bg-white/5"
                >
                  <Icon name="phone" size={17} />
                  {BRAND.phoneDisplay}
                </a>
              </div>
              <p className="mt-6 text-[12px] leading-relaxed text-white/60">
                Редакция цен и условий: {dateRu(LEGAL.updated)}. Условия работ, оплаты и гарантии: в{" "}
                <Link
                  href="/offer"
                  className="text-white/70 underline decoration-white/25 underline-offset-2 hover:decoration-white/60"
                >
                  публичной оферте
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <StickyCta />
    </>
  );
}
