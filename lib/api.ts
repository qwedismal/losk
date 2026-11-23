import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import { cookies, headers } from "next/headers";
import { resolveSession, type SessionContext } from "./auth";
import { verifySessionCsrf, originAllowed } from "./csrf";
import { clientIp, hashIp, hashUa, hit, LIMITS } from "./ratelimit";
import { fieldErrors, type ApiError } from "./validate";
import { SESSION_COOKIE } from "./auth";

/* ---------------------------------------------------------------------------
   Small, consistent HTTP helpers so every route behaves the same way.
   --------------------------------------------------------------------------- */

export function json<T>(data: T, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function fail(status: number, error: string, fields?: Record<string, string>) {
  const body: ApiError = fields ? { error, fields } : { error };
  return json(body, status);
}

export function methodNotAllowed(allow: string[]) {
  return json({ error: "Метод не поддерживается" }, 405, { allow: allow.join(", ") });
}

/** Parse + validate a JSON body. Returns a discriminated result. */
export async function readBody<T>(
  req: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { ok: false, res: fail(415, "Ожидается application/json") };
  }
  const raw = await req.text();
  if (raw.length > 200_000) return { ok: false, res: fail(413, "Слишком большой запрос") };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, res: fail(400, "Некорректный JSON") };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, res: fail(422, "Проверьте поля формы", fieldErrors(result.error)) };
  }
  return { ok: true, data: result.data };
}

export type LimiterPreset = keyof typeof LIMITS;

/** Rate limit by IP + bucket. Returns a 429 response when exceeded. */
export function guard(req: Request, preset: LimiterPreset, scope: string): NextResponse | null {
  const cfg = LIMITS[preset];
  const ip = clientIp(req);
  const key = `${preset}:${scope}:${hashIp(ip)}`;
  const res = hit(key, cfg.limit, cfg.windowMs, cfg.penaltyMs);
  if (!res.ok) {
    return json({ error: "Слишком много попыток. Попробуйте позже." }, 429, {
      "retry-after": String(res.retryAfterSec),
    });
  }
  return null;
}

/** CSRF check for anonymous forms (double-submit cookie + origin). */
export async function anonCsrfOk(req: Request): Promise<boolean> {
  if (!originAllowed(req)) return false;
  const jar = await cookies();
  const cookieValue = jar.get("losk_csrf")?.value;
  const headerValue = req.headers.get("x-csrf-token");
  return Boolean(cookieValue && headerValue && cookieValue === headerValue);
}

export interface OwnerContext {
  session: SessionContext;
  ip: string;
  ipHash: string;
}

/**
 * Full authorisation check for owner endpoints:
 * valid session cookie -> live DB session -> owner role -> CSRF HMAC.
 * Order matters: authorise first, then CSRF, so an attacker learns nothing.
 */
export async function requireOwner(
  req: Request,
  opts: { csrf?: boolean } = { csrf: true },
): Promise<{ ok: true; ctx: OwnerContext } | { ok: false; res: NextResponse }> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = await resolveSession(token);
  if (!session || session.user.role !== "owner") {
    return { ok: false, res: fail(401, "Требуется вход") };
  }

  if (opts.csrf !== false) {
    const provided = req.headers.get("x-csrf-token");
    if (!verifySessionCsrf(session.sessionId, provided)) {
      return { ok: false, res: fail(403, "Ошибка проверки CSRF") };
    }
    if (!originAllowed(req)) {
      return { ok: false, res: fail(403, "Запрос с недопустимого источника") };
    }
  }

  const h = await headers();
  const ip = clientIp(req);
  return {
    ok: true,
    ctx: {
      session,
      ip,
      ipHash: hashIp(ip),
    },
  };
}

export async function requestMeta(req: Request) {
  const h = await headers();
  return {
    ipHash: hashIp(clientIp(req)),
    uaHash: hashUa(h.get("user-agent")),
  };
}
