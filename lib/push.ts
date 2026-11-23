import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { all, dataDir, get, isoNow, newId, run } from "./db";

/**
 * Web Push (VAPID) notifications.
 *
 * Keys resolve in this order: env vars -> data/secrets.json (generated once).
 * Generating on demand means the app works out of the box in a fresh checkout
 * while still letting operators inject managed secrets in production.
 */

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

interface SubRow {
  id: string;
  audience: "owner" | "client";
  audience_ref: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

let cachedKeys: VapidKeys | null = null;

function secretsFile() {
  return path.join(dataDir(), "secrets.json");
}

function loadOrCreateKeys(): VapidKeys | null {
  if (cachedKeys) return cachedKeys;

  const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:owner@losk.ru";

  if (envPublic && envPrivate) {
    cachedKeys = { publicKey: envPublic, privateKey: envPrivate, subject };
    return cachedKeys;
  }

  try {
    const raw = fs.readFileSync(secretsFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<VapidKeys>;
    if (parsed.publicKey && parsed.privateKey) {
      cachedKeys = { publicKey: parsed.publicKey, privateKey: parsed.privateKey, subject };
      return cachedKeys;
    }
  } catch {
    /* not created yet */
  }

  try {
    const generated = webpush.generateVAPIDKeys();
    fs.mkdirSync(dataDir(), { recursive: true });
    const payload = { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
    fs.writeFileSync(secretsFile(), JSON.stringify(payload, null, 2), { mode: 0o600 });
    cachedKeys = payload;
    return cachedKeys;
  } catch {
    return null;
  }
}

export function vapidPublicKey(): string {
  return loadOrCreateKeys()?.publicKey ?? "";
}

function configure(): boolean {
  const keys = loadOrCreateKeys();
  if (!keys) return false;
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  kind?: "new_request" | "quote" | "status" | "payment" | "message";
}

export interface PushResult {
  sent: number;
  removed: number;
  skipped: boolean;
}

async function sendTo(subs: SubRow[], payload: PushPayload): Promise<PushResult> {
  if (subs.length === 0) return { sent: 0, removed: 0, skipped: true };
  if (!configure()) return { sent: 0, removed: 0, skipped: true };

  const body = JSON.stringify({
    ...payload,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    at: new Date().toISOString(),
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 24, urgency: payload.kind === "new_request" ? "high" : "normal" },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    }),
  );

  for (const id of dead) run("DELETE FROM push_subs WHERE id = ?", [id]);

  return { sent, removed: dead.length, skipped: false };
}

export async function notifyOwner(payload: PushPayload): Promise<PushResult> {
  const subs = all<SubRow>("SELECT * FROM push_subs WHERE audience = 'owner'");
  return sendTo(subs, payload);
}

export async function notifyClient(requestId: string, payload: PushPayload): Promise<PushResult> {
  const subs = all<SubRow>("SELECT * FROM push_subs WHERE audience = 'client' AND audience_ref = ?", [
    requestId,
  ]);
  return sendTo(subs, payload);
}

export async function saveSubscription(input: {
  audience: "owner" | "client";
  audienceRef: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  // A browser endpoint is unique per (audience, endpoint): re-subscribing must
  // refresh the keys instead of creating a parallel row that double-notifies.
  run(
    `INSERT INTO push_subs (id, audience, audience_ref, endpoint, p256dh, auth, created_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT (audience, endpoint) DO UPDATE SET
       audience_ref = excluded.audience_ref,
       p256dh = excluded.p256dh,
       auth = excluded.auth`,
    [newId("sub"), input.audience, input.audienceRef, input.endpoint, input.p256dh, input.auth, isoNow()],
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  run("DELETE FROM push_subs WHERE endpoint = ?", [endpoint]);
}

export async function subscriptionCounts(): Promise<{ owner: number; client: number }> {
  const owner = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM push_subs WHERE audience = 'owner'")?.n ?? 0,
  );
  const client = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM push_subs WHERE audience = 'client'")?.n ?? 0,
  );
  return { owner, client };
}
