import { cookies, headers } from "next/headers";
import {
  AUTH_SIG_COOKIE,
  authenticate,
  authSigCookieOptions,
  clearLoginFailures,
  createSession,
  ensureOwnerAccount,
  loginAllowed,
  recordLoginFailure,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionCookieSignature,
} from "@/lib/auth";
import { fail, guard, json, readBody } from "@/lib/api";
import { loginSchema } from "@/lib/validate";
import { clientIp, hashIp, hashUa } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Security properties:
 *  - 8 attempts / 10 min per IP bucket plus a per-email throttle
 *  - constant-time password comparison (scrypt + timingSafeEqual)
 *  - identical error message for unknown email and wrong password
 *  - session token is random 256-bit, only its SHA-256 lands on disk
 *  - cookie is HttpOnly + SameSite=Lax + Secure in production
 */
export async function POST(req: Request) {
  const limited = guard(req, "auth", "login");
  if (limited) return limited;

  const body = await readBody(req, loginSchema);
  if (!body.ok) return body.res;

  await ensureOwnerAccount();

  const { email, password } = body.data;
  const throttleKey = `email:${email}`;
  const ipHash = hashIp(clientIp(req));

  if (!loginAllowed(throttleKey)) {
    return fail(429, "Слишком много попыток. Подождите 15 минут.");
  }

  const user = await authenticate(email, password);

  if (!user) {
    recordLoginFailure(throttleKey);
    logAudit({
      actor: "anonymous",
      action: "auth.login.failed",
      meta: { email: email.slice(0, 40) },
      ipHash,
    });
    return fail(401, "Неверный e-mail или пароль");
  }

  clearLoginFailures(throttleKey);

  const h = await headers();
  const { token, expiresAt } = await createSession(user.id, {
    ipHash,
    uaHash: hashUa(h.get("user-agent")),
  });

  logAudit({ actor: user.email, action: "auth.login", ipHash });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  // Signature cookie: lets the Edge middleware reject forged tokens before render.
  jar.set(AUTH_SIG_COOKIE, sessionCookieSignature(token), authSigCookieOptions(expiresAt));

  return json({ ok: true, redirect: "/admin" });
}
