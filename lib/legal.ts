/**
 * Legal metadata + a safe JSON-LD serializer.
 *
 * Single source for the revision date/version shown on /privacy, /offer and
 * /contacts, so the three documents can never disagree about which redaction
 * is current. Operator details are pulled from BRAND instead of being retyped.
 */

import { BRAND } from "./brand";

export const LEGAL = {
  /** ISO date of the current redaction - rendered through dateRu(). */
  updated: "2026-11-19",
  version: "1.0",
  operator: BRAND.legal,
  operatorFull: "Индивидуальный предприниматель Лоск",
  inn: BRAND.inn,
  ogrnip: "324770000000001",
  phoneDisplay: BRAND.phoneDisplay,
  phoneHref: BRAND.phoneHref,
  email: BRAND.email,
  address: BRAND.address,
  city: BRAND.city,
  /** Statutory answer time for a subject request, in business days (152-ФЗ). */
  responseDays: 10,
  /** How long a completed request is kept for warranty and accounting needs. */
  requestRetentionYears: 3,
  /** Technical logs and diagnostics. */
  logRetentionDays: 90,
} as const;

const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/** "2026-11-19" -> "19 ноября 2026". Falls back to the raw input. */
export function dateRu(iso: string): string {
  const parts = iso.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return iso;
  const monthName = MONTHS_RU[month - 1];
  if (!monthName) return iso;
  return `${day} ${monthName} ${year}`;
}

/**
 * Serialize structured data for an inline <script type="application/ld+json">.
 *
 * `JSON.stringify` output can contain a literal "</script" if any string value
 * does, which would close the tag early and turn data into markup. Escaping "<"
 * (plus ">", "&" and the JS line separators) as JSON unicode escapes keeps the
 * payload inert: it is still valid JSON, and JSON.parse turns it back into the
 * original characters.
 */
export function safeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
