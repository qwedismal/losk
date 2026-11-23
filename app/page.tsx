import type { Metadata } from "next";
import { Nav, StickyCta } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { CtaBlock, Faq, HowWeWork, Prices, Results, Reviews, Trust } from "@/components/landing/Sections";
import { OwnerPreview } from "@/components/landing/OwnerPreview";
import { BRAND } from "@/lib/brand";
import { ensureDemoSeed } from "@/lib/demo";

export const metadata: Metadata = {
  // absolute: the layout template appends "· Лоск", and this title already
  // carries the brand - without `absolute` the homepage would say it twice.
  title: { absolute: "Лоск: химчистка мебели на дому в Москве, калькулятор и заявка за минуту" },
  description:
    "Химчистка дивана от 2 400 ₽, ковра от 1 500 ₽, матраса от 1 800 ₽. Выезд в день заявки, смета до начала работ, гарантия 48 часов. Цену считает калькулятор.",
  alternates: { canonical: "/" },
  // A page-level openGraph object replaces the layout one instead of merging,
  // so every field the social preview needs is stated here explicitly.
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: BRAND.name,
    url: "/",
    title: "Лоск, химчистка мебели на дому в Москве",
    description: "Калькулятор цены, выезд в день заявки, гарантия 48 часов. Оплата после приёмки работ.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Лоск, химчистка мебели на дому" }],
  },
};

/** ISR: the gallery and reviews refresh without a rebuild, while the page stays
 *  fully prerendered HTML for crawlers. */
export const revalidate = 300;

export default async function HomePage() {
  // Demo builds ship with sample applications so the gallery and the cabinet are
  // never empty when a prospect opens the site. No-op unless DEMO_MODE=1.
  await ensureDemoSeed();

  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Trust />
        <HowWeWork />
        <Prices />
        <Results />
        <OwnerPreview />
        <Reviews />
        <Faq />
        <CtaBlock />
        <section aria-label="Способы связи" className="border-t border-line">
          <div className="page flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
            <p className="text-[12.5px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">{BRAND.city} и область.</span> Позвоните: ответим без
              скриптов, подскажем, что реально вычистить, а что лучше не трогать.
            </p>
            <div className="flex gap-2">
              <a
                href={BRAND.phoneHref}
                className="inline-flex h-9 items-center rounded-full bg-canvas-soft px-4 text-[12.5px] font-medium text-ink"
              >
                {BRAND.phoneDisplay}
              </a>
              <a
                href={`mailto:${BRAND.email}`}
                className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[12.5px] font-medium text-ink-soft"
              >
                {BRAND.email}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <StickyCta />
    </>
  );
}
