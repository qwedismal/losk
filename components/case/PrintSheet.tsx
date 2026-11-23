import { Icon } from "@/components/icons";
import { BRAND } from "@/lib/brand";
import { PRINT_FEATURES, PRINT_TIERS } from "@/lib/case";

const HOST = BRAND.site.replace(/^https?:\/\//, "").replace(/\/$/, "");
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])/.test(HOST);
/** Public domain implied by the brand OG asset - keeps localhost off paper. */
const PUBLIC_HOST = BRAND.og.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const PRINT_URL = `${IS_LOCAL ? PUBLIC_HOST : HOST}/case`;
const TELEGRAM_HANDLE = `@${BRAND.telegram.replace(/^https?:\/\/t\.me\//, "")}`;

const BIG_NUMBERS = [
  {
    value: "100/100/100",
    label: "Lighthouse, мобильный профиль",
    note: "Accessibility, Best Practices, SEO",
  },
  {
    value: "681 мс",
    label: "LCP",
    note: "Slow 4G и 4× замедление CPU, CLS 0.00",
  },
  {
    value: "64/64",
    label: "Проверки собственного пентеста",
    note: "CSRF, IDOR, загрузки, вебхуки, rate limit, XSS",
  },
] as const;

const PATH_LINE =
  "Квиз (1 мин) → заявка с кодом (30 сек) → смета в кабинете (5–15 мин) → согласование клиентом → оплата (1–2 мин)";

/**
 * A4 one-pager. Everything is sized in pt/mm so the screen preview and the
 * printed sheet have the same physical proportions. Screen chrome lives in the
 * page; this component is only the document.
 */
export function PrintSheet() {
  return (
    <article className="print-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-canvas text-ink sm:rounded-[10px] sm:shadow-soft print:min-h-0">
      <div className="px-5 py-7 sm:px-[13mm] sm:py-[12mm] print:px-[14mm] print:py-[13mm]">
        {/* ------------------------------------------------------------ masthead */}
        <header className="flex items-start justify-between gap-4 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-ink text-white">
              <Icon name="drop" size={15} variant="line" strokeWidth={2} />
            </span>
            <span className="text-[13pt] font-semibold leading-none tracking-[-0.03em]">
              {BRAND.name}
              <span className="text-accent-deep">.</span>
            </span>
            <span className="mt-0.5 hidden font-mono text-[8pt] tracking-[0.01em] text-mute sm:inline">
              демо-проект
            </span>
          </div>
          <p className="text-right font-mono text-[8pt] leading-[1.45] text-mute">
            {PRINT_URL}
            <br />
            one-pager · A4
          </p>
        </header>

        {/* --------------------------------------------------------------- title */}
        <section className="keep mt-5">
          <p className="font-mono text-[8.5pt] tracking-[0.01em] text-accent-deep">
            сайт химчистки с кабинетом и оплатой
          </p>
          <h1 className="mt-1.5 max-w-[26ch] text-[20pt] font-semibold leading-[1.08]">
            Сайт, который доводит клиента до оплаты
          </h1>
          <p className="mt-2.5 text-[9.5pt] font-medium tracking-[0.01em] text-mute">что это</p>
          <p className="mt-1 max-w-[86ch] text-[10pt] leading-[1.45] text-ink-soft">
            «{BRAND.name}»: готовый сайт химчистки: квиз с ценой, заявки со сметой, кабинет владельца, фото до
            и после, онлайн-оплата и PWA с push. Это не концепт: демо работает, метрики ниже сняты на нём.
          </p>
          <p className="mt-1.5 max-w-[86ch] text-[10pt] leading-[1.45] text-ink-soft">
            <span className="font-semibold text-ink">Для кого:</span> химчистки и клининговые компании, где
            заявки принимают в мессенджерах и вручную согласуют цену. Сайт снимает с владельца переписку,
            расчёт и напоминания.
          </p>
        </section>

        {/* -------------------------------------------------------------- numbers */}
        <section
          aria-label="Ключевые цифры"
          className="keep mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3"
        >
          {BIG_NUMBERS.map((item) => (
            <div
              key={item.value}
              className="rounded-[6px] border border-line bg-canvas-soft px-3 py-2.5 print-tint"
            >
              <p className="tnum font-mono text-[15pt] font-semibold leading-none">{item.value}</p>
              <p className="mt-1 text-[8.5pt] font-medium leading-[1.3] text-ink">{item.label}</p>
              <p className="mt-0.5 text-[8pt] leading-[1.35] text-mute">{item.note}</p>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------------------- features */}
        <section className="keep mt-5">
          <h2 className="border-b border-line pb-1 text-[10pt] font-semibold tracking-[0.01em]">
            Что делает сайт
          </h2>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 print:grid-cols-2">
            {PRINT_FEATURES.map((item) => (
              <li key={item.title} className="flex gap-1.5 text-[10pt] leading-[1.35]">
                <span
                  aria-hidden
                  className="mt-[1.5mm] size-[1.1mm] shrink-0 rounded-[0.3mm] bg-accent-deep"
                />
                <span>
                  <span className="font-medium text-ink">{item.title}</span>
                  <span className="text-ink-soft">: {item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ----------------------------------------------------------------- path */}
        <section className="keep mt-5 rounded-[6px] border border-line px-3 py-2.5">
          <p className="font-mono text-[8pt] tracking-[0.01em] text-mute">путь клиента</p>
          <p className="mt-0.5 font-mono text-[9.5pt] leading-[1.45] text-ink">{PATH_LINE}</p>
        </section>

        {/* ---------------------------------------------------------------- tiers */}
        <section className="keep mt-5">
          <h2 className="border-b border-line pb-1 text-[10pt] font-semibold tracking-[0.01em]">Тарифы</h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 print:grid-cols-3">
            {PRINT_TIERS.map((tier) => (
              <div key={tier.name} className="rounded-[6px] border border-line px-2.5 py-2">
                <p className="text-[10pt] font-semibold leading-[1.25]">{tier.name}</p>
                <p className="mt-0.5 text-[9.5pt] leading-[1.35] text-ink-soft">{tier.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[8.5pt] leading-[1.4] text-mute">
            Цены зависят от города и объёма работ: обсуждаем на созвоне и фиксируем в смете до старта.
          </p>
        </section>

        {/* -------------------------------------------------------------- contact */}
        <section className="keep mt-6 border-t border-ink/20 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[10pt] font-semibold tracking-[0.01em]">Обсудить проект</h2>
            <p className="font-mono text-[8pt] text-mute">созвон 20 минут</p>
          </div>
          <p className="mt-1.5 text-[10pt] leading-[1.4] text-ink-soft">
            Разбираем поток заявок и состав системы, после созвона присылаю смету с этапами, сроками и суммой.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10pt] leading-[1.4]">
            <li>
              <span className="text-mute">Telegram: </span>
              <a href={BRAND.telegram} className="font-medium text-ink">
                {TELEGRAM_HANDLE}
              </a>
            </li>
            <li>
              <span className="text-mute">Телефон: </span>
              <a href={BRAND.phoneHref} className="font-medium text-ink">
                {BRAND.phoneDisplay}
              </a>
            </li>
            <li>
              <span className="text-mute">Почта: </span>
              <a href={`mailto:${BRAND.email}`} className="font-medium text-ink">
                {BRAND.email}
              </a>
            </li>
          </ul>
        </section>

        {/* --------------------------------------------------------------- footer */}
        <footer className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-2 text-[8pt] leading-[1.4] text-mute">
          <p>
            {BRAND.legal} · {BRAND.city} · {BRAND.hours}
          </p>
          <p>26 маршрутов · 4 процедурные 3D-модели · не индексируется</p>
        </footer>
      </div>
    </article>
  );
}
