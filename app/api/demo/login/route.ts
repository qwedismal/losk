import { cookies, headers } from "next/headers";
import {
  AUTH_SIG_COOKIE,
  authSigCookieOptions,
  createSession,
  ensureOwnerAccount,
  findUserByEmail,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionCookieSignature,
} from "@/lib/auth";
import { DEMO_MODE } from "@/lib/demo";
import { fail, guard, json } from "@/lib/api";
import { clientIp, hashIp, hashUa } from "@/lib/ratelimit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/login - one-click entry into the owner cabinet.
 *
 * This is a deliberate convenience for a sales demo: a prospect must be able to
 * click through the admin without a password. It is therefore hard-gated:
 *   - returns 404 unless DEMO_MODE is on,
 *   - still rate limited,
 *   - grants the *demo* owner account only (no arbitrary user selection),
 *   - every call is written to the audit log.
 * In a real deployment DEMO_MODE stays off and this route simply does not exist.
 */
export async function POST(req: Request) {
  if (!DEMO_MODE) return fail(404, "Не найдено");

  const limited = guard(req, "auth", "demo-login");
  if (limited) return limited;

  await ensureOwnerAccount();
  const email = (process.env.ADMIN_EMAIL || "owner@losk.ru").trim().toLowerCase();
  const user = findUserByEmail(email);
  if (!user) return fail(503, "Демо-аккаунт не настроен");

  const h = await headers();
  const ip = clientIp(req);
  const { token, expiresAt } = await createSession(user.id, {
    ipHash: hashIp(ip),
    uaHash: hashUa(h.get("user-agent")),
  });

  logAudit({ actor: "demo", action: "auth.demo_login", ipHash: hashIp(ip) });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  jar.set(AUTH_SIG_COOKIE, sessionCookieSignature(token), authSigCookieOptions(expiresAt));

  return json({ ok: true, redirect: "/admin" });
}
