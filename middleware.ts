import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware.
 *
 * Two jobs that are safe without the database:
 *  1. reject a forged or tampered session cookie BEFORE React starts streaming.
 *     A redirect thrown from a Server Component after the shell is flushed is
 *     delivered as HTTP 200, which looks like an authorisation hole even though
 *     no protected data is rendered. The signature cookie (`losk_sig` = HMAC of
 *     the session token) lets the Edge runtime prove the pair is ours; the real
 *     authorisation is still the database lookup in the page/route.
 *  2. issue the anonymous CSRF double-submit cookie.
 *
 * The nonce-less CSP lives in next.config.ts so it also covers static responses.
 */

const CSRF_COOKIE = "losk_csrf";
const SESSION_COOKIE = "losk_sid";
const AUTH_SIG_COOKIE = "losk_sig";

function randomId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacB64Url(value: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time-ish comparison; lengths are equal for HMAC output. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // --- reject anything that is not a session we issued ----------------------
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sid = req.cookies.get(SESSION_COOKIE)?.value;
    const sig = req.cookies.get(AUTH_SIG_COOKIE)?.value;
    const valid = Boolean(sid && sig && sameString(await hmacB64Url(sid), sig));

    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url);
      // Clean up a garbage pair so the browser does not keep replaying it.
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.delete(AUTH_SIG_COOKIE);
      return res;
    }
  }

  const res = NextResponse.next();

  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, randomId(), {
      httpOnly: false, // must be readable by the booking form's JS
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static files. Keeping the cookie fresh
     * on HTML navigations is enough for the double-submit pattern.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|og.png|manifest.webmanifest|sw.js|robots.txt|sitemap.xml).*)",
  ],
};
