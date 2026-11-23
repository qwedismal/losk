import { z } from "zod";
import { fail, guard, json } from "@/lib/api";
import { applyPaymentEvent, verifyEvent, type PaymentEvent } from "@/lib/payments";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.string().min(4).max(120),
  type: z.enum(["payment.succeeded", "payment.failed", "payment.refunded"]),
  paymentId: z.string().min(4).max(120),
  requestId: z.string().min(4).max(120),
  amount: z.number().int().min(0).max(1_000_000),
  last4: z.string().max(4),
  issuedAt: z.number().int(),
  nonce: z.string().min(8).max(120),
});

const payloadSchema = z.object({
  event: eventSchema,
  signature: z.string().length(64),
});

/**
 * POST /api/payments/webhook - provider callback.
 *
 * This endpoint is unauthenticated by design (the PSP cannot hold a session), so
 * the HMAC signature IS the authentication. Replay protection comes from the
 * nonce cache + the 5-minute timestamp tolerance inside `verifyEvent`.
 * Signature verification happens before any state is touched.
 */
export async function POST(req: Request) {
  const limited = guard(req, "payment", "webhook");
  if (limited) return limited;

  const raw = await req.text();
  if (raw.length > 8000) return fail(413, "Payload too large");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid JSON");
  }

  const result = payloadSchema.safeParse(parsed);
  if (!result.success) return fail(400, "Invalid payload");

  const { event, signature } = result.data;
  const verdict = verifyEvent(event as PaymentEvent, signature);
  if (!verdict.ok) {
    // Deliberately terse: never explain which check failed.
    return json({ ok: false }, 401);
  }

  const applied = await applyPaymentEvent(event as PaymentEvent);
  if (!applied.ok) return json({ ok: false }, 400);

  return json({ ok: true });
}
