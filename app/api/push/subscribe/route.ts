import { cookies } from "next/headers";
import { fail, guard, json, readBody, requireOwner } from "@/lib/api";
import { removeSubscription, saveSubscription, vapidPublicKey } from "@/lib/push";
import { findByTrackToken } from "@/lib/requests";
import { pushSubscribeSchema } from "@/lib/validate";
import { resolveSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/push/key - the VAPID public key the browser needs to subscribe. */
export async function GET() {
  return json({ publicKey: vapidPublicKey() }, 200, { "cache-control": "public, max-age=3600" });
}

/**
 * POST /api/push/subscribe
 *  - audience "owner"  -> requires a live owner session + CSRF
 *  - audience "client" -> requires the request's secret track token
 * Anyone cannot subscribe an arbitrary endpoint to someone else's notifications.
 */
export async function POST(req: Request) {
  const limited = guard(req, "track", "push-subscribe");
  if (limited) return limited;

  const body = await readBody(req, pushSubscribeSchema);
  if (!body.ok) return body.res;

  const { audience, token, subscription } = body.data;
  const endpoint = subscription.endpoint;
  if (!/^https:\/\//.test(endpoint)) return fail(400, "Некорректный endpoint");

  if (audience === "owner") {
    const auth = await requireOwner(req);
    if (!auth.ok) return auth.res;
    await saveSubscription({
      audience: "owner",
      audienceRef: auth.ctx.session.user.id,
      endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    return json({ ok: true, audience: "owner" });
  }

  if (!token) return fail(400, "Нужен токен заявки");
  const request = await findByTrackToken(token);
  if (!request) return fail(404, "Заявка не найдена");

  await saveSubscription({
    audience: "client",
    audienceRef: request.id,
    endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  return json({ ok: true, audience: "client" });
}

/** DELETE /api/push/subscribe - unsubscribe by endpoint. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint.startsWith("https://")) return fail(400, "Некорректный endpoint");

  const jar = await cookies();
  const session = await resolveSession(jar.get(SESSION_COOKIE)?.value);
  if (session?.user.role === "owner") {
    await removeSubscription(endpoint);
    return json({ ok: true });
  }

  // A client may only remove a subscription that points at a request it can prove.
  const token = typeof body?.token === "string" ? body.token : "";
  const request = token ? await findByTrackToken(token) : null;
  if (!request) return fail(404, "Заявка не найдена");
  await removeSubscription(endpoint);
  return json({ ok: true });
}
