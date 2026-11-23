import { z } from "zod";

/**
 * All input is validated server-side with zod. Rules are deliberately strict:
 * anything not explicitly allowed is rejected, and strings are length-capped to
 * keep the JSON store and the UI predictable.
 */

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

const CONTROL_CHARS = /[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029]/g;

export function stripControl(input: string): string {
  return input
    .replace(CONTROL_CHARS, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let d = digits;
  if (d.length === 11 && d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("9")) d = `7${d}`;
  if (d.length !== 11 || !d.startsWith("7")) return null;
  return `+${d}`;
}

export function formatPhone(maskedOrFull: string): string {
  const d = maskedOrFull.replace(/\D/g, "");
  if (d.length !== 11) return maskedOrFull;
  return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length < 6) return "***";
  return `+${d[0]} (${d.slice(1, 4)}) ***-**-${d.slice(-2)}`;
}

// ---------------------------------------------------------------------------
// shared field schemas
// ---------------------------------------------------------------------------

export const itemKey = z.enum(["sofa", "carpet", "mattress", "other"]);
export const sizeKey = z.enum(["small", "medium", "large", "xl"]);
export const stainLevel = z.enum(["none", "light", "heavy"]);
export const timingKey = z.enum(["asap", "week", "flexible"]);
export const slotKey = z.enum(["morning", "day", "evening"]);

const phoneField = z
  .string()
  .min(10, "Укажите телефон")
  .max(24)
  .transform((v) => normalizePhone(v))
  .refine((v): v is string => Boolean(v), "Телефон в формате +7 XXX XXX-XX-XX");

const nameField = z
  .string()
  .min(2, "Как к вам обращаться")
  .max(40)
  .transform(stripControl)
  .refine((v) => /^[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z\s'.-]{1,39}$/u.test(v), "Только буквы, пробел, дефис");

const textField = (max: number) => z.string().max(max).transform(stripControl).default("");

// ---------------------------------------------------------------------------
// public endpoints
// ---------------------------------------------------------------------------

export const quizSchema = z.object({
  item: itemKey,
  size: sizeKey,
  stains: stainLevel,
  timing: timingKey,
  quantity: z.number().int().min(1).max(5),
});

export const bookingSchema = z.object({
  /** Client-generated idempotency key (uuid): an offline retry must not duplicate. */
  clientRequestId: z.string().uuid().optional(),
  quiz: quizSchema,
  client: z.object({
    name: nameField,
    phone: phoneField,
    address: textField(200).optional(),
    district: textField(80).optional(),
    comment: textField(500).optional(),
    preferredDate: z
      .string()
      .max(32)
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате ГГГГ-ММ-ДД")
      .optional()
      .or(z.literal("")),
    preferredSlot: slotKey.optional(),
  }),
  /** anti-bot: must be empty (checked in the route so the response stays generic) */
  website: z.string().max(200).optional().default(""),
  /** client-side ms spent on the form; bots submit instantly */
  elapsedMs: z
    .number()
    .int()
    .min(0)
    .max(1000 * 60 * 60 * 6)
    .optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Нужно согласие на обработку данных" }) }),
  /** Optional photos uploaded through /api/requests/attachments. IDs are
   *  server-generated; anything else is ignored when the booking is created. */
  photoIds: z.array(z.string().regex(/^img_[a-f0-9]{32}$/)).max(2).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(5).max(120).email("Проверьте e-mail"),
  password: z.string().min(8, "Минимум 8 символов").max(200),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "new",
    "contacted",
    "quote_sent",
    "confirmed",
    "done",
    "awaiting_payment",
    "paid",
    "closed",
    "cancelled",
  ]),
  note: textField(400).optional(),
  notifyClient: z.boolean().optional().default(true),
});

export const quoteSchema = z.object({
  price: z.number().int().min(0).max(500_000),
  note: textField(400).optional(),
  notifyClient: z.boolean().optional().default(true),
});

export const publishPhotosSchema = z.object({
  published: z.boolean(),
});

export const trackLookupSchema = z.object({
  token: z.string().min(16).max(120),
});

export const paymentIntentSchema = z.object({
  token: z.string().min(16).max(120),
  idempotencyKey: z.string().min(8).max(80),
});

export const paymentConfirmSchema = z.object({
  /** secret pay link token - knowing a payment id is never enough */
  token: z.string().min(16).max(120),
  paymentId: z.string().min(10).max(120),
  idempotencyKey: z.string().min(8).max(80),
  /** Sandbox only: card number is validated with Luhn, then discarded. */
  card: z
    .string()
    .min(12)
    .max(23)
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => /^\d{12,19}$/.test(v), "Только цифры")
    .refine(isLuhnValid, "Проверьте номер карты"),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "ММ/ГГ"),
  cvc: z.string().regex(/^\d{3,4}$/, "3 цифры"),
  holder: textField(60).optional(),
});

export function isLuhnValid(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (Number.isNaN(d)) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const pushSubscribeSchema = z.object({
  audience: z.enum(["owner", "client"]),
  token: z.string().min(1).max(120).optional(),
  subscription: z.object({
    endpoint: z.string().url().max(500),
    keys: z.object({
      p256dh: z.string().min(20).max(200),
      auth: z.string().min(8).max(60),
    }),
  }),
});

/** Uniform, non-leaky error shape for the client. */
export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
