import { fail, guard, json, readBody } from "@/lib/api";
import { buildEvent, chargeSandbox, findPayment, simulateProviderWebhook } from "@/lib/payments";
import { paymentConfirmSchema } from "@/lib/validate";
import { findByPayToken, findById } from "@/lib/requests";
import { notifyOwner } from "@/lib/push";
import { formatMoney } from "@/lib/pricing";
import { hit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/confirm - sandbox card charge.
 *
 * PCI notes: the card number is used only for the Luhn check inside this request
 * handler, then dropped. It is never written to disk, never logged, and never
 * echoed back - only the last four digits are persisted. In production this call
 * is replaced by the PSP's hosted checkout / tokenisation, so card data never
 * reaches our servers at all.
 */
export async function POST(req: Request) {
  const limited = guard(req, "payment", "confirm");
  if (limited) return limited;

  const body = await readBody(req, paymentConfirmSchema);
  if (!body.ok) return body.res;

  const { token, paymentId, card, expiry, cvc } = body.data;

  const request = await findByPayToken(token);
  if (!request) return fail(404, "Счёт не найден");

  // Anti card-testing: cap attempts per payment object.
  const attempt = hit(`pay-attempt:${paymentId}`, 6, 10 * 60 * 1000, 15 * 60 * 1000);
  if (!attempt.ok) return fail(429, "Слишком много попыток оплаты. Подождите 15 минут.");

  const payment = findPayment(paymentId);
  if (!payment || payment.requestId !== request.id) return fail(404, "Платёж не найден");
  if (payment.status === "paid") return fail(409, "Платёж уже проведён");

  const expected = request.quote.price ?? 0;
  if (payment.amount !== expected) return fail(409, "Сумма платежа устарела, обновите страницу");

  const charge = chargeSandbox({ card, expiry, cvc });

  if (!charge.ok) {
    await simulateProviderWebhook(buildEvent(payment, "payment.failed", charge.last4)).catch(() => {});
    return fail(402, charge.declineReason || "Платёж отклонён");
  }

  const verdict = await simulateProviderWebhook(buildEvent(payment, "payment.succeeded", charge.last4));
  if (!verdict.ok) return fail(502, "Не удалось подтвердить платёж");

  const fresh = await findById(request.id);

  await notifyOwner({
    title: "Оплата получена",
    body: `${request.code} · ${formatMoney(payment.amount)} · карта **** ${charge.last4}`,
    url: `/admin/request/${request.id}`,
    tag: `payment-${request.code}`,
    kind: "payment",
  }).catch(() => {});

  return json({
    ok: true,
    status: "paid",
    receipt: fresh?.payment?.receipt ?? null,
    last4: charge.last4,
    amount: payment.amount,
  });
}
