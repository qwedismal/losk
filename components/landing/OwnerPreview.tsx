import Link from "next/link";
import { Icon, IconPlate } from "@/components/icons";
import { Eyebrow, Reveal } from "@/components/ui";

/**
 * Sales block for the business owner (not the end client).
 *
 * It is the only place on the landing that shows the cabinet, and it exists for
 * one reason: a prospect evaluating the site needs to see that the money path
 * (application → quote → approval → payment) already works.
 */
const POINTS = [
  {
    icon: "ruble" as const,
    title: "Смета в один клик",
    text: "Цена фиксируется в заявке. Клиент видит её, согласует и переходит к оплате, без звонков и переписки.",
  },
  {
    icon: "list" as const,
    title: "Статусы вместо хаоса",
    text: "Новая → связались → смета → мастер → оплата. Каждый шаг пишется в историю и уходит клиенту пушем.",
  },
  {
    icon: "photo" as const,
    title: "Фото до/после",
    text: "Загрузили с телефона, опубликовали. Пара сразу попадает в заявку клиента и в галерею на сайте.",
  },
];

export function OwnerPreview() {
  return (
    <section id="owner" className="scroll-mt-20 overflow-hidden py-14 sm:py-20">
      <div className="page">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow>Владельцу</Eyebrow>
              <h2 className="mt-2.5 text-[clamp(26px,5.4vw,42px)] font-semibold leading-[1.05]">
                Заявка не теряется
                <br />в переписке
              </h2>
              <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
                У каждой заявки есть код, статус и история. Клиент видит смету и согласует её сам, а вы:
                только принимаете решение по цене и времени.
              </p>
            </Reveal>

            <ul className="mt-6 space-y-3.5">
              {POINTS.map((point, i) => (
                <Reveal as="li" key={point.title} delay={80 + i * 70} className="flex gap-3">
                  <IconPlate name={point.icon} size={17} />
                  <div>
                    <p className="text-[14.5px] font-semibold leading-snug">{point.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{point.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                href="/admin/login"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white transition-transform duration-200 active:scale-[.98] hover:bg-[#22252b]"
              >
                Посмотреть кабинет
              </Link>
              <Link
                href="/case"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-canvas px-4 text-[14px] font-medium text-ink-soft transition-colors hover:bg-canvas-soft hover:text-ink"
              >
                Что входит в работу
                <Icon name="arrowUpRight" size={15} />
              </Link>
            </div>
          </div>

          {/* cabinet screenshot in a device-ish frame */}
          <Reveal delay={120} className="lg:col-span-7">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-x-6 -top-6 bottom-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_20%,rgba(15,182,166,.16),transparent_72%)] blur-[2px]"
              />
              <figure className="relative overflow-hidden rounded-[24px] border border-line bg-canvas shadow-lift">
                <div className="flex items-center gap-1.5 border-b border-line bg-canvas-soft px-3 py-2">
                  <span className="size-2 rounded-full bg-line" />
                  <span className="size-2 rounded-full bg-line" />
                  <span className="size-2 rounded-full bg-line" />
                  <span className="ml-2 truncate rounded-full bg-canvas px-2 py-0.5 text-[10px] text-mute">
                    losk.pro/admin
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screens/04-admin-requests.png"
                  alt="Кабинет владельца: список заявок со статусами, суммами и фильтрами"
                  width={780}
                  height={1688}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[520px] w-full object-cover object-top"
                />
              </figure>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
