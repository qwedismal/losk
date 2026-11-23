import crypto from "node:crypto";

/**
 * CSRF protection - two independent mechanisms:
 *
 * 1. Session-bound HMAC token for the owner area (`x-csrf-token` header).
 *    Stateless: token = HMAC(CSRF_SECRET, sessionId). Rotates with the session,
 *    cannot be minted by an attacker without the server secret.
 * 2. Double-submit cookie for anonymous forms (booking, payment).
 *    A non-httpOnly random cookie is set on every navigation; the client echoes
 *    it in a header. Cross-site attackers can send the cookie but cannot read
 *    it, so they cannot fill the header.
 *
 * Both are combined with a strict Origin/Referer check for state changes.
 */

const SECRET = process.env.CSRF_SECRET || "dev-only-csrf-secret-change-me";

export const ANON_CSRF_COOKIE = "losk_csrf";

export function sessionCsrfToken(sessionId: string): string {
  return crypto.createHmac("sha256", SECRET).update(`s:${sessionId}`).digest("base64url").slice(0, 43);
}

export function verifySessionCsrf(sessionId: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const expected = sessionCsrfToken(sessionId);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function newAnonCsrfValue(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Origin check. Requests without an Origin header (some native clients) fall
 * back to the Referer for state-changing verbs; both missing => reject.
 */
export function originAllowed(req: Request): boolean {
  const allowedOrigin = (() => {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3210";
    try {
      return new URL(site).origin;
    } catch {
      return "http://localhost:3210";
    }
  })();

  const origin = req.headers.get("origin");
  if (origin) return origin === allowedOrigin || origin === new URL(req.url).origin;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin || new URL(referer).origin === new URL(req.url).origin;
    } catch {
      return false;
    }
  }
  // Same-origin fetches from the service worker / server-side calls carry no
  // Origin; require an explicit marker header instead of trusting nothing.
  return req.headers.get("sec-fetch-site") === "same-origin" || req.headers.get("x-losk-client") === "1";
}
