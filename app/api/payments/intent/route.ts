import { fail, guard, json, readBody } from "@/lib/api";
import { createPaymentRecord } from "@/lib/payments";
import { paymentIntentSchema } from "@/lib/validate";
import { findByPayToken } from "@/lib/requests";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/intent
 *
 * The server - not the browser - decides the amount. The client only supplies a
 * payment token and an idempotency key, so a tampered request cannot change the
 * price, and a double click cannot create two payments.
 */
export async function POST(req: Request) {
  const limited = guard(req, "payment", "intent");
  if (limited) return limited;

  const body = await readBody(req, paymentIntentSchema);
  if (!body.ok) return body.res;

  const { token, idempotencyKey } = body.data;
  const request = await findByPayToken(token);
  if (!request) return fail(404, "Счёт не найден");
  if (request.payment?.status === "paid") return fail(409, "Заявка уже оплачена");

  const amount = request.quote.price ?? 0;
  if (!amount || amount < 1) return fail(409, "Смета ещё не согласована");

  const payment = await createPaymentRecord(request, amount, idempotencyKey);

  return json({
    ok: true,
    paymentId: payment.id,
    amount: payment.amount,
    code: request.code,
    alreadyPaid: payment.status === "paid",
  });
}
