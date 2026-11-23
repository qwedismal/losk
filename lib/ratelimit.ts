/**
 * In-process sliding-window rate limiter.
 *
 * Single instance only: in a multi-instance deployment swap `hit()` for a Redis
 * INCR/EXPIRE implementation (same signature). Keys are hashed before storage
 * so raw IPs never sit in memory longer than the window.
 */
import crypto from "node:crypto";

type Bucket = { hits: number[]; blockedUntil?: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;
let lastSweep = Date.now();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
}

export function clientIp(req: Request): string {
  // Trust the platform-provided forwarding chain only when explicitly enabled.
  if (process.env.TRUST_PROXY === "1") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "local";
}

export function hashIp(ip: string): string {
  const secret = process.env.SESSION_SECRET || "dev-salt";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

export function hashUa(ua: string | null): string {
  return crypto
    .createHash("sha256")
    .update(ua || "")
    .digest("hex")
    .slice(0, 32);
}

export function hit(key: string, limit: number, windowMs: number, penaltyMs = 0): RateResult {
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    lastSweep = now;
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) {
        const newest = v.hits[v.hits.length - 1] ?? 0;
        if (now - newest > 60 * 60 * 1000 && (!v.blockedUntil || v.blockedUntil < now)) buckets.delete(k);
      }
    }
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000),
      limit,
    };
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    if (penaltyMs > 0) bucket.blockedUntil = now + penaltyMs;
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((penaltyMs > 0 ? penaltyMs : windowMs) / 1000),
      limit,
    };
  }

  bucket.hits.push(now);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0, limit };
}

export function resetRateLimit(key?: string) {
  if (key) buckets.delete(key);
  else buckets.clear();
}

/** Route presets - kept in one place so limits are auditable. */
export const LIMITS = {
  booking: { limit: 10, windowMs: 10 * 60 * 1000, penaltyMs: 10 * 60 * 1000 },
  auth: { limit: 8, windowMs: 10 * 60 * 1000, penaltyMs: 15 * 60 * 1000 },
  payment: { limit: 12, windowMs: 10 * 60 * 1000, penaltyMs: 5 * 60 * 1000 },
  upload: { limit: 30, windowMs: 10 * 60 * 1000, penaltyMs: 10 * 60 * 1000 },
  read: { limit: 120, windowMs: 60 * 1000, penaltyMs: 0 },
  track: { limit: 20, windowMs: 10 * 60 * 1000, penaltyMs: 30 * 60 * 1000 },
} as const;
