import type {
  Estimate,
  ItemKey,
  PriceBreakdownLine,
  QuizAnswers,
  SizeKey,
  StainLevel,
  TimingKey,
} from "./types";

/**
 * Single source of truth for the price calculator. Pure, dependency-free and
 * imported by BOTH the client (instant preview) and the server (authoritative
 * estimate) - the server never trusts a client-sent price.
 */

export interface ItemDef {
  key: ItemKey;
  label: string;
  short: string;
  base: number;
  sizes: { key: SizeKey; label: string; factor: number }[];
  durationMin: number;
  blurb: string;
}

export const ITEMS: ItemDef[] = [
  {
    key: "sofa",
    label: "Диван",
    short: "Диван",
    base: 2400,
    durationMin: 75,
    blurb: "Экстрактор, обивка, подушки и каркас",
    sizes: [
      { key: "small", label: "2 места", factor: 1 },
      { key: "medium", label: "3 места", factor: 1.3 },
      { key: "large", label: "Угловой", factor: 1.65 },
      { key: "xl", label: "Кресло", factor: 0.55 },
    ],
  },
  {
    key: "carpet",
    label: "Ковёр",
    short: "Ковёр",
    base: 1500,
    durationMin: 40,
    blurb: "Глубокая чистка ворса, без залива пола",
    sizes: [
      { key: "small", label: "до 3 м²", factor: 1 },
      { key: "medium", label: "3–6 м²", factor: 1.5 },
      { key: "large", label: "6–10 м²", factor: 2.1 },
      { key: "xl", label: "больше 10 м²", factor: 2.8 },
    ],
  },
  {
    key: "mattress",
    label: "Матрас",
    short: "Матрас",
    base: 1800,
    durationMin: 50,
    blurb: "Двусторонне, с антиаллергенной обработкой",
    sizes: [
      { key: "small", label: "Односпальный", factor: 1 },
      { key: "medium", label: "1,5-спальный", factor: 1.15 },
      { key: "large", label: "Двуспальный", factor: 1.35 },
      { key: "xl", label: "King size", factor: 1.5 },
    ],
  },
  {
    key: "other",
    label: "Другое",
    short: "Другое",
    base: 1200,
    durationMin: 45,
    blurb: "Кресла, стулья, шторы, пуфы",
    sizes: [
      { key: "small", label: "Кресло или пуф", factor: 1 },
      { key: "medium", label: "2–4 стула", factor: 1.4 },
      { key: "large", label: "Шторы, комплект", factor: 1.8 },
      { key: "xl", label: "Другая мебель", factor: 1.6 },
    ],
  },
];

export const STAINS: { key: StainLevel; label: string; hint: string; factor: number }[] = [
  { key: "none", label: "Чисто", hint: "Только пыль и залоснившиеся места", factor: 1 },
  { key: "light", label: "Пара пятен", hint: "Кофе, еда, следы от рук", factor: 1.12 },
  { key: "heavy", label: "Сложные", hint: "Жир, вино, запах, следы животного", factor: 1.3 },
];

export const TIMINGS: { key: TimingKey; label: string; hint: string; factor: number }[] = [
  { key: "asap", label: "Сегодня-завтра", hint: "Срочный выезд, +20%", factor: 1.2 },
  { key: "week", label: "На этой неделе", hint: "Стандартная запись", factor: 1 },
  { key: "flexible", label: "Как удобно мастеру", hint: "Скидка 7% за гибкость", factor: 0.93 },
];

export function getItem(key: ItemKey): ItemDef {
  return ITEMS.find((i) => i.key === key) ?? ITEMS[0];
}

export function getSize(item: ItemKey, size: SizeKey) {
  const def = getItem(item);
  return def.sizes.find((s) => s.key === size) ?? def.sizes[0];
}

export function getStain(key: StainLevel) {
  return STAINS.find((s) => s.key === key) ?? STAINS[0];
}

export function getTiming(key: TimingKey) {
  return TIMINGS.find((t) => t.key === key) ?? TIMINGS[1];
}

export function quantityDiscount(quantity: number): number {
  if (quantity >= 3) return 0.15;
  if (quantity === 2) return 0.1;
  return 0;
}

const round10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);

export function calculate(answers: QuizAnswers): Estimate {
  const item = getItem(answers.item);
  const size = getSize(answers.item, answers.size);
  const stain = getStain(answers.stains);
  const timing = getTiming(answers.timing);
  const qty = Math.min(10, Math.max(1, Math.round(answers.quantity || 1)));

  const unit = item.base * size.factor;
  const subtotal = unit * qty;
  const stainFee = subtotal * (stain.factor - 1);
  const timingFee = subtotal * (timing.factor - 1);
  const discountRate = quantityDiscount(qty);
  const discount = -(subtotal + stainFee + timingFee) * discountRate;

  const total = subtotal + stainFee + timingFee + discount;

  const lines: PriceBreakdownLine[] = [
    { label: `${item.label} · ${size.label}${qty > 1 ? ` × ${qty}` : ""}`, amount: round10(subtotal) },
  ];
  if (stainFee > 0) lines.push({ label: `Пятна: ${stain.label.toLowerCase()}`, amount: round10(stainFee) });
  if (timingFee !== 0)
    lines.push({ label: `Срок: ${timing.label.toLowerCase()}`, amount: round10(timingFee) });
  if (discount < 0)
    lines.push({ label: `Скидка за объём ${Math.round(discountRate * 100)}%`, amount: round10(discount) });

  const from = round10(total);
  const to = round10(total * 1.12);

  const durationMin =
    Math.round((item.durationMin * size.factor * qty + (answers.stains === "heavy" ? 25 : 0)) / 15) * 15;

  return {
    from,
    to: Math.max(to, from + 100),
    currency: "RUB",
    lines,
    durationMin: Math.max(30, durationMin),
  };
}

export const CURRENCY = "₽";

export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString("ru-RU").replace(/,/g, " ")} ${CURRENCY}`;
}

export function formatMoneyShort(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ")} ${CURRENCY}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/** Cheapest honest entry price across all services - used in meta/OG copy. */
export const MIN_PRICE = ITEMS.reduce(
  (min, item) => Math.min(min, Math.round(item.base * 0.55)),
  Number.POSITIVE_INFINITY,
);
