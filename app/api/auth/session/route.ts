import { json, requireOwner } from "@/lib/api";
import { sessionCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session - the owner's own session summary plus the CSRF token
 * bound to it. Safe to expose: the request must already carry a valid HttpOnly
 * session cookie, so only the browser (or an integration holding that cookie)
 * can read it. Useful for scripted clients and for pages that outlive a token
 * rotation.
 */
export async function GET(req: Request) {
  const auth = await requireOwner(req, { csrf: false });
  if (!auth.ok) return auth.res;

  return json({
    user: {
      email: auth.ctx.session.user.email,
      name: auth.ctx.session.user.name,
      role: auth.ctx.session.user.role,
    },
    csrfToken: sessionCsrfToken(auth.ctx.session.sessionId),
    expiresAt: auth.ctx.session.expiresAt,
  });
}
