import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * SQLite persistence layer (node:sqlite - built into Node 22.5+, no native deps).
 *
 * Why a real database instead of the previous JSON document:
 *  - durable WAL journal, transactions and indexes instead of a whole-file rewrite
 *  - concurrent reads while writing; crash-safe commits
 *  - schema migrations with `PRAGMA user_version`
 *  - the same SQL shape maps 1:1 to Postgres, so moving to a serverless host later
 *    is a driver swap, not a rewrite
 *
 * Design notes:
 *  - nested domain objects (quiz, estimate, timeline, …) are stored as JSON text
 *    inside the row. SQLite (and Postgres `jsonb`) treat that as first-class data;
 *    only fields we actually query/filter on get their own column.
 *  - every write goes through `tx()` (BEGIN IMMEDIATE) so multi-statement updates
 *    are atomic and a crash cannot leave a half-written request behind.
 */

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

export const DB_FILE = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DATA_DIR, "losk.db");

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** Legacy JSON store - imported once on first boot, then left untouched. */
export const LEGACY_JSON = path.join(DATA_DIR, "db.json");

export type SqlParam = null | number | bigint | string | Uint8Array;

export function dataDir(): string {
  return DATA_DIR;
}

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const MIGRATIONS: readonly string[] = [
  // v1 - initial schema
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
    password_hash TEXT NOT NULL,
    notify_json   TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE sessions (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    ip_hash      TEXT NOT NULL,
    ua_hash      TEXT NOT NULL
  );
  CREATE INDEX idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  CREATE TABLE requests (
    id                TEXT PRIMARY KEY,
    client_request_id TEXT UNIQUE,
    code              TEXT NOT NULL UNIQUE,
    track_token       TEXT NOT NULL UNIQUE,
    pay_token         TEXT NOT NULL UNIQUE,
    status            TEXT NOT NULL,
    client_name       TEXT NOT NULL,
    client_phone      TEXT NOT NULL,
    client_json       TEXT NOT NULL,
    quiz_json         TEXT NOT NULL,
    estimate_json     TEXT NOT NULL,
    quote_json        TEXT NOT NULL,
    payment_json      TEXT,
    photos_json       TEXT NOT NULL DEFAULT '{"before":[],"after":[],"published":false}',
    photos_published  INTEGER NOT NULL DEFAULT 0,
    timeline_json     TEXT NOT NULL DEFAULT '[]',
    source            TEXT NOT NULL DEFAULT 'site',
    ip_hash           TEXT NOT NULL DEFAULT '',
    ua_hash           TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX idx_requests_status_created ON requests(status, created_at DESC);
  CREATE INDEX idx_requests_created ON requests(created_at DESC);
  CREATE INDEX idx_requests_phone ON requests(client_phone);
  CREATE INDEX idx_requests_updated ON requests(updated_at DESC);
  CREATE INDEX idx_requests_published ON requests(photos_published);

  CREATE TABLE uploads (
    id         TEXT PRIMARY KEY,
    request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    bytes      INTEGER NOT NULL,
    sha256     TEXT NOT NULL,
    width      INTEGER NOT NULL,
    height     INTEGER NOT NULL,
    file       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_uploads_request ON uploads(request_id);

  CREATE TABLE push_subs (
    id           TEXT PRIMARY KEY,
    audience     TEXT NOT NULL CHECK (audience IN ('owner', 'client')),
    audience_ref TEXT NOT NULL,
    endpoint     TEXT NOT NULL,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    UNIQUE (audience, endpoint)
  );
  CREATE INDEX idx_push_audience ON push_subs(audience, audience_ref);

  CREATE TABLE payments (
    id               TEXT PRIMARY KEY,
    request_id       TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    amount           INTEGER NOT NULL,
    currency         TEXT NOT NULL DEFAULT 'RUB',
    status           TEXT NOT NULL,
    provider         TEXT NOT NULL,
    idempotency_key  TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    paid_at          TEXT,
    last4            TEXT,
    receipt          TEXT,
    webhook_verified INTEGER NOT NULL DEFAULT 0,
    UNIQUE (request_id, idempotency_key)
  );
  CREATE INDEX idx_payments_status ON payments(status);
  CREATE INDEX idx_payments_request ON payments(request_id);

  CREATE TABLE audit (
    id        TEXT PRIMARY KEY,
    at        TEXT NOT NULL,
    actor     TEXT NOT NULL,
    action    TEXT NOT NULL,
    target    TEXT,
    meta_json TEXT,
    ip_hash   TEXT
  );
  CREATE INDEX idx_audit_at ON audit(at DESC);
  CREATE INDEX idx_audit_action ON audit(action, at DESC);
  `,

  // v2 - bookkeeping table.
  // `legacy_imported` prevents the one-time JSON import from running again after
  // a demo reset has emptied the tables (otherwise old sample data would come
  // back from the dead on the next restart).
  `
  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,

  // v3 - rapid lookup of photos uploaded by clients that are not attached to a
  // request yet (booking form still open, or abandoned and swept later).
  `
  CREATE INDEX idx_uploads_pending ON uploads(kind, created_at) WHERE request_id IS NULL;
  `,
];

/* -------------------------------------------------------------------------- */
/* Connection                                                                 */
/* -------------------------------------------------------------------------- */

let connection: DatabaseSync | null = null;
let migrated = false;
let txDepth = 0;

function connect(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const conn = new DatabaseSync(DB_FILE);
  conn.exec("PRAGMA journal_mode = WAL");
  conn.exec("PRAGMA foreign_keys = ON");
  conn.exec("PRAGMA busy_timeout = 5000");
  conn.exec("PRAGMA synchronous = NORMAL");
  return conn;
}

export function getDb(): DatabaseSync {
  if (!connection) connection = connect();
  if (!migrated) {
    migrate(connection);
    migrated = true;
  }
  return connection;
}

function migrate(conn: DatabaseSync): void {
  const row = conn.prepare("PRAGMA user_version").get() as { user_version?: number } | undefined;
  const current = Number(row?.user_version ?? 0);

  for (let version = current; version < MIGRATIONS.length; version++) {
    conn.exec("BEGIN IMMEDIATE");
    try {
      conn.exec(MIGRATIONS[version]);
      // user_version is a compile-time pragma; the value is a loop index, not input
      conn.exec(`PRAGMA user_version = ${version + 1}`);
      conn.exec("COMMIT");
    } catch (err) {
      try {
        conn.exec("ROLLBACK");
      } catch {
        /* already rolled back */
      }
      throw err;
    }
  }

  importLegacyJson(conn);
}

/**
 * One-time import of the old `data/db.json` document so an existing demo
 * (requests, photos, sessions) survives the switch to SQL. Runs only when the
 * database is completely empty.
 */
function importLegacyJson(conn: DatabaseSync): void {
  const marker = conn.prepare("SELECT value FROM meta WHERE key = 'legacy_imported'").get() as
    { value: string } | undefined;
  if (marker) return;

  const count = conn.prepare("SELECT COUNT(*) AS n FROM requests").get() as { n: number };
  const users = conn.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };

  const markDone = () => {
    conn.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_imported', ?)").run(isoNow());
  };

  if (Number(count.n) > 0 || Number(users.n) > 0) {
    markDone();
    return;
  }
  if (!fs.existsSync(LEGACY_JSON)) {
    markDone();
    return;
  }

  let legacy: Record<string, unknown>;
  try {
    legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, "utf8")) as Record<string, unknown>;
  } catch {
    return;
  }

  const arr = <T>(key: string): T[] => (Array.isArray(legacy[key]) ? (legacy[key] as T[]) : []);
  const iso = (v: unknown) => (typeof v === "string" ? v : new Date().toISOString());

  conn.exec("BEGIN IMMEDIATE");
  try {
    for (const u of arr<Record<string, unknown>>("users")) {
      conn
        .prepare(
          `INSERT OR IGNORE INTO users (id,email,name,role,password_hash,notify_json,created_at,last_login_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(
          String(u.id),
          String(u.email),
          String(u.name ?? "Владелец"),
          String(u.role ?? "owner"),
          String(u.passwordHash),
          JSON.stringify(u.notify ?? {}),
          iso(u.createdAt),
          u.lastLoginAt ? String(u.lastLoginAt) : null,
        );
    }

    for (const s of arr<Record<string, unknown>>("sessions")) {
      conn
        .prepare(
          `INSERT OR IGNORE INTO sessions (id,user_id,created_at,expires_at,last_seen_at,ip_hash,ua_hash)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .run(
          String(s.id),
          String(s.userId),
          iso(s.createdAt),
          iso(s.expiresAt),
          iso(s.lastSeenAt),
          String(s.ipHash ?? ""),
          String(s.uaHash ?? ""),
        );
    }

    for (const r of arr<Record<string, unknown>>("requests")) {
      const client = (r.client ?? {}) as Record<string, unknown>;
      conn
        .prepare(
          `INSERT OR IGNORE INTO requests
           (id,client_request_id,code,track_token,pay_token,status,client_name,client_phone,client_json,quiz_json,
            estimate_json,quote_json,payment_json,photos_json,photos_published,timeline_json,source,ip_hash,ua_hash,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          String(r.id),
          null,
          String(r.code),
          String(r.trackToken),
          String(r.payToken),
          String(r.status ?? "new"),
          String(client.name ?? ""),
          String(client.phone ?? ""),
          JSON.stringify(client),
          JSON.stringify(r.quiz ?? {}),
          JSON.stringify(r.estimate ?? {}),
          JSON.stringify(r.quote ?? {}),
          r.payment ? JSON.stringify(r.payment) : null,
          JSON.stringify(r.photos ?? { before: [], after: [], published: false }),
          (r.photos as { published?: boolean } | undefined)?.published ? 1 : 0,
          JSON.stringify(r.timeline ?? []),
          String(r.source ?? "site"),
          String(r.ipHash ?? ""),
          String(r.userAgentHash ?? ""),
          iso(r.createdAt),
          iso(r.updatedAt),
        );
    }

    for (const up of arr<Record<string, unknown>>("uploads")) {
      conn
        .prepare(
          `INSERT OR IGNORE INTO uploads (id,request_id,kind,mime,bytes,sha256,width,height,file,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          String(up.id),
          up.requestId ? String(up.requestId) : null,
          String(up.kind ?? "before"),
          String(up.mime ?? "image/png"),
          Number(up.bytes ?? 0),
          String(up.sha256 ?? ""),
          Number(up.width ?? 0),
          Number(up.height ?? 0),
          String(up.file ?? ""),
          iso(up.createdAt),
        );
    }

    for (const p of arr<Record<string, unknown>>("pushSubs")) {
      conn
        .prepare(
          `INSERT OR IGNORE INTO push_subs (id,audience,audience_ref,endpoint,p256dh,auth,created_at)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .run(
          String(p.id),
          String(p.audience ?? "owner"),
          String(p.audienceRef ?? ""),
          String(p.endpoint ?? ""),
          String(p.p256dh ?? ""),
          String(p.auth ?? ""),
          iso(p.createdAt),
        );
    }

    for (const p of arr<Record<string, unknown>>("payments")) {
      conn
        .prepare(
          `INSERT OR IGNORE INTO payments
           (id,request_id,amount,currency,status,provider,idempotency_key,created_at,paid_at,last4,receipt,webhook_verified)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          String(p.id),
          String(p.requestId),
          Number(p.amount ?? 0),
          String(p.currency ?? "RUB"),
          String(p.status ?? "pending"),
          String(p.provider ?? "sandbox"),
          String(p.idempotencyKey ?? p.id ?? ""),
          iso(p.createdAt),
          p.paidAt ? String(p.paidAt) : null,
          p.last4 ? String(p.last4) : null,
          p.receipt ? String(p.receipt) : null,
          p.webhookVerified ? 1 : 0,
        );
    }

    conn.exec("COMMIT");
  } catch (err) {
    try {
      conn.exec("ROLLBACK");
    } catch {
      /* noop */
    }
    throw err;
  }

  conn.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacy_imported', ?)").run(isoNow());
}

/* -------------------------------------------------------------------------- */
/* Query helpers                                                              */
/* -------------------------------------------------------------------------- */

export function all<T>(sql: string, params: SqlParam[] = []): T[] {
  return getDb()
    .prepare(sql)
    .all(...params) as unknown as T[];
}

export function get<T>(sql: string, params: SqlParam[] = []): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...params) as unknown as T | undefined;
}

export function run(sql: string, params: SqlParam[] = []): number {
  const res = getDb()
    .prepare(sql)
    .run(...params);
  return Number(res.changes);
}

/**
 * Atomic write. Re-entrant: a nested call joins the outer transaction instead of
 * opening a second one (SQLite has no nested BEGIN).
 */
export function tx<T>(fn: () => T): T {
  const conn = getDb();
  if (txDepth > 0) {
    txDepth++;
    try {
      return fn();
    } finally {
      txDepth--;
    }
  }

  conn.exec("BEGIN IMMEDIATE");
  txDepth = 1;
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      conn.exec("ROLLBACK");
    } catch {
      /* noop */
    }
    throw err;
  } finally {
    txDepth = 0;
  }
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export function newId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "")}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Test/maintenance helper - closes the connection so the file can be moved. */
export function closeDb(): void {
  if (connection) {
    connection.close();
    connection = null;
    migrated = false;
  }
}
