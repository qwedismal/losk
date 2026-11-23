import crypto from "node:crypto";
import { get, isoNow, newId, run, tx } from "./db";
import { logAudit } from "./audit";
import { receiptNumber } from "./ids";
import { findByIdSync } from "./requests";
import type { PaymentRecord, ServiceRequest, TimelineEntry } from "./types";

/**
 * Payments - provider abstraction + a working sandbox implementation.
 *
 * The sandbox mirrors the shape of a real PSP integration:
 *   1. client asks the server for an intent (server decides the amount),
 *   2. client hands card data to the "provider" (never persisted, never logged),
 *   3. provider returns a signed webhook event,
 *   4. server verifies signature + timestamp + nonce, then fulfils inside a
 *      single SQL transaction (payment row + request status + timeline).
 *
 * Swapping in YooKassa/Stripe means implementing `charge()` and pointing the
 * webhook endpoint at the real provider: the rest of the flow is unchanged.
 */

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret-change-me";
const TOLERANCE_MS = 5 * 60 * 1000;

export interface CardInput {
  card: string;
  expiry: string;
  cvc: string;
  holder?: string;
}

export interface ChargeResult {
  ok: boolean;
  last4: string;
  declineReason?: string;
  authCode?: string;
}

/** Sandbox test cards: 4000 0000 0000 0002 declines, everything else passes. */
const DECLINE_CARD = "4000000000000002";

export function chargeSandbox(input: CardInput): ChargeResult {
  const digits = input.card.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  if (digits === DECLINE_CARD) {
    return { ok: false, last4, declineReason: "Карта отклонена банком (тестовая карта)" };
  }
  const [mm, yy] = input.expiry.split("/");
  const exp = new Date(2000 + Number(yy), Number(mm), 1);
  if (exp.getTime() < Date.now()) {
    return { ok: false, last4, declineReason: "Срок действия карты истёк" };
  }
  return { ok: true, last4, authCode: crypto.randomBytes(3).toString("hex").toUpperCase() };
}

// ---------------------------------------------------------------------------
// Signed events (webhook)
// ---------------------------------------------------------------------------

const seenEvents = new Map<string, number>();

export interface PaymentEvent {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded";
  paymentId: string;
  requestId: string;
  amount: number;
  last4: string;
  issuedAt: number;
  nonce: string;
}

export function signEvent(event: PaymentEvent): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(canonical(event)).digest("hex");
}

function canonical(event: PaymentEvent): string {
  return [
    event.id,
    event.type,
    event.paymentId,
    event.requestId,
    event.amount,
    event.last4,
    event.issuedAt,
    event.nonce,
  ].join("|");
}

export function verifyEvent(event: PaymentEvent, signature: string): { ok: boolean; reason?: string } {
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return { ok: false, reason: "bad signature format" };
  const expected = signEvent(event);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return { ok: false, reason: "signature mismatch" };
  if (Math.abs(Date.now() - event.issuedAt) > TOLERANCE_MS) return { ok: false, reason: "stale event" };
  if (seenEvents.has(event.nonce)) return { ok: false, reason: "replay" };
  return { ok: true };
}

function rememberEvent(nonce: string) {
  seenEvents.set(nonce, Date.now());
  if (seenEvents.size > 2000) {
    const cutoff = Date.now() - TOLERANCE_MS * 2;
    for (const [k, v] of seenEvents) if (v < cutoff) seenEvents.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

interface PaymentRow {
  id: string;
  request_id: string;
  amount: number;
  currency: string;
  status: PaymentRecord["status"];
  provider: string;
  idempotency_key: string;
  created_at: string;
  paid_at: string | null;
  last4: string | null;
  receipt: string | null;
  webhook_verified: number;
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    amount: Number(row.amount),
    currency: "RUB",
    status: row.status,
    provider: row.provider,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    last4: row.last4,
    receipt: row.receipt,
    webhookVerified: Number(row.webhook_verified) === 1,
  };
}

export function findPayment(id: string): PaymentRecord | null {
  const row = get<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
  return row ? mapPayment(row) : null;
}

export async function createPaymentRecord(
  request: ServiceRequest,
  amount: number,
  idempotencyKey: string,
): Promise<PaymentRecord> {
  // Idempotency is enforced by a UNIQUE(request_id, idempotency_key) index, so a
  // double click or an offline retry can never create two chargeable payments.
  return tx(() => {
    const existing = get<PaymentRow>("SELECT * FROM payments WHERE request_id = ? AND idempotency_key = ?", [
      request.id,
      idempotencyKey,
    ]);
    if (existing) return mapPayment(existing);

    const id = newId("pay");
    run(
      `INSERT INTO payments (id, request_id, amount, currency, status, provider, idempotency_key, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, request.id, amount, "RUB", "pending", "sandbox", idempotencyKey, isoNow()],
    );
    const row = get<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
    return mapPayment(row as PaymentRow);
  });
}

function updateRequestAfterPayment(
  request: ServiceRequest,
  patch: {
    status: ServiceRequest["status"];
    payment: ServiceRequest["payment"];
    entry: TimelineEntry;
  },
): void {
  const timeline: TimelineEntry[] = [...request.timeline, patch.entry];
  run("UPDATE requests SET status = ?, payment_json = ?, timeline_json = ?, updated_at = ? WHERE id = ?", [
    patch.status,
    JSON.stringify(patch.payment),
    JSON.stringify(timeline),
    isoNow(),
    request.id,
  ]);
}

export async function applyPaymentEvent(event: PaymentEvent): Promise<{ ok: boolean; reason?: string }> {
  if (seenEvents.has(event.nonce)) return { ok: false, reason: "replay" };
  rememberEvent(event.nonce);

  return tx(() => {
    const row = get<PaymentRow>("SELECT * FROM payments WHERE id = ?", [event.paymentId]);
    if (!row) return { ok: false, reason: "unknown payment" };

    // Validate the payload against what we asked to charge BEFORE any
    // idempotency shortcut - an amount mismatch is an anomaly we must surface
    // even when the payment already settled.
    if (Number(row.amount) !== event.amount) return { ok: false, reason: "amount mismatch" };
    if (row.status === "paid" && event.type === "payment.succeeded") {
      return { ok: true, reason: "already paid (idempotent)" };
    }

    const request = get<{ id: string }>("SELECT id FROM requests WHERE id = ?", [event.requestId]);
    if (!request) return { ok: false, reason: "unknown request" };
    const full = findByIdSync(request.id);
    if (!full) return { ok: false, reason: "unknown request" };

    const now = isoNow();

    if (event.type === "payment.succeeded") {
      const receipt = receiptNumber();
      run(
        `UPDATE payments SET status = 'paid', paid_at = ?, last4 = ?, receipt = ?, webhook_verified = 1 WHERE id = ?`,
        [now, event.last4, receipt, row.id],
      );
      updateRequestAfterPayment(full, {
        status: "paid",
        payment: {
          id: row.id,
          status: "paid",
          amount: Number(row.amount),
          paidAt: now,
          method: "card",
          last4: event.last4,
          receipt,
        },
        entry: {
          at: now,
          type: "payment",
          title: "Оплата получена",
          note: `Чек ${receipt} · ${Number(row.amount).toLocaleString("ru-RU")} ₽`,
          clientVisible: true,
        },
      });
      logAudit({
        actor: "provider",
        action: "payment.succeeded",
        target: full.code,
        meta: { amount: Number(row.amount) },
      });
    } else if (event.type === "payment.failed") {
      run("UPDATE payments SET status = 'failed' WHERE id = ?", [row.id]);
      updateRequestAfterPayment(full, {
        status: "awaiting_payment",
        payment: {
          id: row.id,
          status: "pending",
          amount: Number(row.amount),
          paidAt: null,
          method: null,
          last4: null,
          receipt: null,
        },
        entry: {
          at: now,
          type: "payment",
          title: "Оплата не прошла",
          note: "Клиент может попробовать другой картой",
          clientVisible: true,
        },
      });
      logAudit({ actor: "provider", action: "payment.failed", target: full.code });
    } else {
      run("UPDATE payments SET status = 'refunded' WHERE id = ?", [row.id]);
      logAudit({ actor: "provider", action: "payment.refunded", target: full.code });
    }

    return { ok: true };
  });
}

export function buildEvent(payment: PaymentRecord, type: PaymentEvent["type"], last4: string): PaymentEvent {
  return {
    id: newId("evt"),
    type,
    paymentId: payment.id,
    requestId: payment.requestId,
    amount: payment.amount,
    last4,
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };
}

/**
 * Sandbox "provider callback": the charge already happened in-process, so we
 * sign the event and push it through the exact same verification path a real
 * webhook would take. This keeps the security logic honest.
 */
export async function simulateProviderWebhook(
  event: PaymentEvent,
): Promise<{ ok: boolean; reason?: string }> {
  const signature = signEvent(event);
  const verdict = verifyEvent(event, signature);
  if (!verdict.ok) return { ok: false, reason: verdict.reason };
  return applyPaymentEvent(event);
}
