import { z } from "zod";
import { fail, guard, json, readBody } from "@/lib/api";
import { findByCodeAndPhone } from "@/lib/requests";
import { normalizePhone } from "@/lib/validate";
import { hit, hashIp, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(4).max(20),
  phone: z.string().min(6).max(24),
});

/**
 * POST /api/track/find - "I lost my link" recovery.
 *
 * Requires the request code AND the phone number used in the booking. Both are
 * checked, the response is identical for "wrong code" and "wrong phone", and the
 * endpoint is limited to 5 attempts / 10 minutes per IP so the pair cannot be
 * brute-forced.
 */
export async function POST(req: Request) {
  const limited = guard(req, "track", "find");
  if (limited) return limited;

  const ip = hashIp(clientIp(req));
  if (!hit(`track-find:${ip}`, 5, 10 * 60 * 1000, 20 * 60 * 1000).ok) {
    return fail(429, "Слишком много попыток. Попробуйте через 20 минут.");
  }

  const body = await readBody(req, schema);
  if (!body.ok) return body.res;

  const code = body.data.code.trim().toUpperCase();
  const phone = normalizePhone(body.data.phone);
  if (!phone) return fail(422, "Проверьте номер телефона", { phone: "Введите телефон полностью" });

  const request = await findByCodeAndPhone(code, phone);
  if (!request) {
    // Same message and shape for every miss.
    return fail(404, "Заявка не найдена. Проверьте код и телефон.");
  }

  return json({ ok: true, trackUrl: `/t/${request.trackToken}` });
}
