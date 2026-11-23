import { NextResponse } from "next/server";
import { createRequest } from "@/lib/requests";
import { anonCsrfOk, fail, guard, json, readBody, requestMeta } from "@/lib/api";
import { bookingSchema } from "@/lib/validate";
import { notifyOwner } from "@/lib/push";
import { formatMoney, getItem } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * POST /api/requests - public booking endpoint.
 *
 * Layered defences, cheapest first:
 *   1. rate limit per IP (burst + sustained penalty)
 *   2. CSRF double-submit cookie + Origin check
 *   3. content-type + size + zod validation
 *   4. bot signals (honeypot field, unrealistic submit time)
 *   5. authoritative price calculation server-side (client value ignored)
 *   6. idempotency key - a retried offline submission returns the same request
 */
export async function POST(req: Request) {
  const limited = guard(req, "booking", "create");
  if (limited) return limited;

  if (!(await anonCsrfOk(req))) {
    return fail(403, "Обновите страницу и попробуйте снова");
  }

  const body = await readBody(req, bookingSchema);
  if (!body.ok) return body.res;

  const input = body.data;

  // Honeypot: real users never see this field.
  if (input.website && input.website.length > 0) {
    return fail(400, "Не удалось отправить заявку");
  }

  // A human needs a few seconds to fill three steps. Bots post instantly.
  if (typeof input.elapsedMs === "number" && input.elapsedMs < 900) {
    return fail(400, "Не удалось отправить заявку");
  }

  const meta = await requestMeta(req);
  const { request, duplicate } = await createRequest(input, meta, input.clientRequestId);

  if (!duplicate) {
    // Owner push is best-effort: a push outage must never fail a booking.
    try {
      await notifyOwner({
        title: "Новая заявка",
        body: `${input.client.name} · ${getItem(input.quiz.item).label} · ${formatMoney(request.estimate.from)}${
          request.photos.client.length > 0 ? " · фото" : ""
        }`,
        url: `/admin/request/${request.id}`,
        tag: `request-${request.code}`,
        kind: "new_request",
      });
    } catch {
      /* ignore */
    }
  }

  return json(
    {
      ok: true,
      duplicate,
      code: request.code,
      trackUrl: `/t/${request.trackToken}`,
      estimate: request.estimate,
      photoCount: request.photos.client.length,
    },
    duplicate ? 200 : 201,
  );
}

export function GET() {
  // Never expose a list of requests on a public endpoint.
  return NextResponse.json({ error: "Метод не поддерживается" }, { status: 405, headers: { allow: "POST" } });
}
