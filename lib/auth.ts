import crypto from "node:crypto";
import type { User } from "./types";
import { all, get, isoNow, newId, parseJson, run, tx } from "./db";

/**
 * Password hashing: scrypt from node:crypto (built-in, memory-hard, no deps).
 * Format: scrypt$N$r$p$salt$hash - parameters travel with the hash so the cost
 * can be raised later without invalidating existing passwords.
 */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT.maxmem,
  });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "losk_sid";
/**
 * Second cookie: an HMAC of the session token. It lets the Edge middleware
 * reject a garbage or tampered cookie before React starts streaming (a redirect
 * thrown after the shell is flushed comes back as 200, which looks like a hole
 * even though no data is rendered). The authoritative check is still the
 * database lookup in the page/route.
 */
export const AUTH_SIG_COOKIE = "losk_sig";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function sessionCookieSignature(token: string): string {
  const secret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
  return crypto.createHmac("sha256", secret).update(token).digest("base64url");
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export interface SessionContext {
  sessionId: string;
  user: User;
  expiresAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "owner" | "manager";
  password_hash: string;
  notify_json: string;
  created_at: string;
  last_login_at: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  ip_hash: string;
  ua_hash: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: "owner",
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    notify: parseJson(row.notify_json, { newRequest: true, payment: true, quietHours: false }),
  };
}

export function findUserByEmail(email: string): User | null {
  const row = get<UserRow>("SELECT * FROM users WHERE email = ? COLLATE NOCASE", [email.toLowerCase()]);
  return row ? mapUser(row) : null;
}

export function findUserById(id: string): User | null {
  const row = get<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  return row ? mapUser(row) : null;
}

export async function createSession(
  userId: string,
  meta: { ipHash: string; uaHash: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const now = isoNow();

  tx(() => {
    // housekeeping: drop expired sessions on every login
    run("DELETE FROM sessions WHERE expires_at <= ?", [now]);
    run(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, ip_hash, ua_hash)
       VALUES (?,?,?,?,?,?,?)`,
      [sha256(token), userId, now, expiresAt.toISOString(), now, meta.ipHash, meta.uaHash],
    );
    run("UPDATE users SET last_login_at = ? WHERE id = ?", [now, userId]);
  });

  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined): Promise<SessionContext | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const id = sha256(token);

  const row = get<SessionRow & { user_id: string }>("SELECT * FROM sessions WHERE id = ?", [id]);
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE id = ?", [id]);
    return null;
  }

  const userRow = get<UserRow>("SELECT * FROM users WHERE id = ?", [row.user_id]);
  if (!userRow) return null;

  // Rolling "last seen", throttled to once an hour to avoid a write per request.
  if (Date.now() - new Date(row.last_seen_at).getTime() > 1000 * 60 * 60) {
    run("UPDATE sessions SET last_seen_at = ? WHERE id = ?", [isoNow(), id]);
  }

  const user = mapUser(userRow);
  return { sessionId: id, user: { ...user, role: "owner" }, expiresAt: row.expires_at };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  run("DELETE FROM sessions WHERE id = ?", [sha256(token)]);
}

export function destroyAllSessionsFor(userId: string): number {
  return run("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    // Always Secure in production. COOKIE_INSECURE=1 exists only so a local
    // `next start` demo over plain http://localhost can hold a session; it must
    // never be set on a real deployment.
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function authSigCookieOptions(expiresAt: Date) {
  return sessionCookieOptions(expiresAt);
}

/** Ensures the single owner account exists (idempotent). */
export async function ensureOwnerAccount(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || "owner@losk.ru").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  const existing = get<{ id: string }>("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
  if (existing) return;

  run(
    `INSERT INTO users (id, email, name, role, password_hash, notify_json, created_at, last_login_at)
     VALUES (?,?,?,?,?,?,?,NULL)`,
    [
      newId("usr"),
      email,
      "Владелец",
      "owner",
      hashPassword(password),
      JSON.stringify({ newRequest: true, payment: true, quietHours: false }),
      isoNow(),
    ],
  );
}

/** Verifies credentials. Always runs the KDF so timing cannot reveal a missing user. */
export async function authenticate(email: string, password: string): Promise<User | null> {
  await ensureOwnerAccount();
  const user = findUserByEmail(email);
  const dummy =
    "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
    "ZHVtbXlkdW1teWR1bW15ZHVtbXlkdW1teWR1bW15ZHVtbXlkdW1teWR1bW15ZA==";
  const ok = verifyPassword(password, user?.passwordHash ?? dummy);
  return user && ok ? user : null;
}

export async function changeOwnerPassword(userId: string, password: string): Promise<void> {
  run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(password), userId]);
  destroyAllSessionsFor(userId);
}

/* -------------------------------------------------------------------------- */
/* Login throttling (in-memory; see lib/ratelimit.ts for the HTTP layer)       */
/* -------------------------------------------------------------------------- */

const loginAttempts = new Map<string, number[]>();

export function loginAllowed(key: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const list = (loginAttempts.get(key) ?? []).filter((t) => now - t < windowMs);
  loginAttempts.set(key, list);
  return list.length < 8;
}

export function recordLoginFailure(key: string): void {
  const list = loginAttempts.get(key) ?? [];
  list.push(Date.now());
  loginAttempts.set(key, list.slice(-50));
}

export function clearLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

/** Kept for tooling: lists owner accounts without exposing hashes. */
export function listOwners(): Array<Pick<User, "id" | "email" | "name" | "createdAt" | "lastLoginAt">> {
  return all<UserRow>("SELECT * FROM users WHERE role = 'owner'").map((row) => {
    const u = mapUser(row);
    return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt };
  });
}
