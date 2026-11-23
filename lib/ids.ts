import crypto from "node:crypto";

/**
 * Unguessable identifiers.
 * - tracking / payment tokens: 24 random bytes (192 bits) - the only thing that
 *   authorises a read on a request, so it must be far beyond brute-force range.
 * - public request code: human-friendly, 8 chars from a 32-symbol unambiguous
 *   alphabet (~10^12 combinations) - always paired with a token when it grants
 *   access, never used alone as an authorisation factor.
 */

/** Alphabet without look-alikes: no 0/O, 1/I/L. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function publicCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `LK-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function secretToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function receiptNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `LK-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function timingSafeStrEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
