"use client";

/**
 * Offline booking queue.
 *
 * Why: a form that silently fails on a flaky mobile connection is the most
 * expensive bug in lead generation. Instead of losing the submission, the
 * payload is stored locally and replayed when the network returns.
 *
 * Correctness rules:
 *  - every queued item carries a `clientRequestId`; the server treats it as an
 *    idempotency key, so a replay after a timeout cannot create a duplicate;
 *  - permanent rejections (403 CSRF, 422 validation, 429) are dropped instead of
 *    retried forever - a stale cookie must not block the queue;
 *  - the queue survives a reload and is flushed on start as well as on `online`.
 */

const KEY = "losk.pending.v1";
const MAX_ITEMS = 5;
const EVENT_SENT = "losk:queued-sent";
const EVENT_DROPPED = "losk:queued-dropped";
const EVENT_ADDED = "losk:queued-added";

export interface QueuedBooking {
  clientRequestId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

function read(): QueuedBooking[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedBooking => {
      const candidate = item as Partial<QueuedBooking>;
      return typeof candidate?.clientRequestId === "string" && typeof candidate?.payload === "object";
    });
  } catch {
    return [];
  }
}

function write(items: QueuedBooking[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage full or blocked - nothing else we can do */
  }
}

export function queuedCount(): number {
  return read().length;
}

export function queueBooking(payload: Record<string, unknown>, clientRequestId: string): void {
  const items = read().filter((item) => item.clientRequestId !== clientRequestId);
  items.push({ clientRequestId, payload, queuedAt: new Date().toISOString() });
  write(items);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_ADDED, { detail: { count: items.length } }));
  }
}

export function dropBooking(clientRequestId: string): void {
  write(read().filter((item) => item.clientRequestId !== clientRequestId));
}

export interface FlushResult {
  sent: number;
  failed: number;
  codes: string[];
}

let flushing = false;

export async function flushQueue(): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0, codes: [] };
  if (flushing) return result;
  if (typeof window === "undefined" || !navigator.onLine) return result;

  const items = read();
  if (items.length === 0) return result;

  flushing = true;
  try {
    for (const item of items) {
      try {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "content-type": "application/json", "x-losk-client": "1", ...csrf() },
          body: JSON.stringify(item.payload),
          cache: "no-store",
          credentials: "same-origin",
        });

        if (res.ok) {
          const data = (await res.json().catch(() => null)) as { code?: string } | null;
          dropBooking(item.clientRequestId);
          result.sent++;
          if (data?.code) result.codes.push(data.code);
          continue;
        }

        if (res.status === 0 || res.status >= 500) {
          // Transient: keep it for the next attempt.
          result.failed++;
          continue;
        }

        // Permanent: wrong csrf, validation, rate limit - stop retrying.
        dropBooking(item.clientRequestId);
        result.failed++;
        window.dispatchEvent(new CustomEvent(EVENT_DROPPED, { detail: { status: res.status } }));
      } catch {
        result.failed++;
      }
    }
  } finally {
    flushing = false;
  }

  if (result.sent > 0) {
    window.dispatchEvent(
      new CustomEvent(EVENT_SENT, { detail: { count: result.sent, codes: result.codes } }),
    );
  }

  return result;
}

function csrf(): Record<string, string> {
  const match = document.cookie.match(/(?:^|;\s*)losk_csrf=([^;]+)/);
  return match ? { "x-csrf-token": decodeURIComponent(match[1]) } : {};
}

export const QUEUE_EVENTS = { sent: EVENT_SENT, dropped: EVENT_DROPPED, added: EVENT_ADDED } as const;
