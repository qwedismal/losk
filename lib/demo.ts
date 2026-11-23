import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { all, get, isoNow, newId, run, tx, UPLOAD_DIR } from "./db";
import { ensureOwnerAccount } from "./auth";
import { addPhoto, createRequest, insertUpload, setPhotosPublished } from "./requests";
import { simulateProviderWebhook } from "./payments";
import type { BookingInput } from "./validate";
import type { Upload } from "./types";

/**
 * Demo mode.
 *
 * The site is meant to be shown to prospects, so it ships with a believable
 * dataset: three applications in different states and one published
 * before/after pair. `DEMO_MODE=1` enables:
 *   - seeding on first boot (idempotent),
 *   - one-click entry into the owner cabinet from the login screen,
 *   - the "reset demo" action.
 *
 * Everything here is strictly additive: disabling DEMO_MODE leaves a normal,
 * production-shaped install.
 */

export const DEMO_MODE = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

const DEMO_ASSETS = path.join(process.cwd(), "assets", "demo");

let seedChecked = false;

function hasRequests(): boolean {
  return Number(get<{ n: number }>("SELECT COUNT(*) AS n FROM requests")?.n ?? 0) > 0;
}

function demoBooking(overrides: Partial<BookingInput> & { quiz: BookingInput["quiz"] }): BookingInput {
  return {
    quiz: overrides.quiz,
    client: {
      name: "Анна",
      phone: "+79161112233",
      address: "Хамовники, ул. Льва Толстого, 14",
      comment: "",
      preferredSlot: "day",
      ...overrides.client,
    },
    website: "",
    elapsedMs: 5000,
    consent: true,
  };
}

async function attachDemoPhoto(requestId: string, kind: "before" | "after", fileName: string): Promise<void> {
  const source = path.join(DEMO_ASSETS, fileName);
  if (!fs.existsSync(source)) return;

  const bytes = fs.readFileSync(source);
  const id = `img_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  const stored = `${id}.png`;
  const abs = path.resolve(path.join(UPLOAD_DIR, stored));
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(abs, bytes, { mode: 0o600 });

  const upload: Upload = {
    id,
    requestId,
    kind,
    mime: "image/png",
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: 800,
    height: 600,
    createdAt: isoNow(),
    file: stored,
  };
  insertUpload(upload);

  await addPhoto(
    requestId,
    {
      id,
      kind,
      mime: "image/png",
      width: 800,
      height: 600,
      createdAt: upload.createdAt,
      caption: kind === "before" ? "До чистки" : "После чистки",
    },
    "demo-seed",
  );
}

/** Wipes demo content (keeps the owner account) and rebuilds it. */
export async function installDemoData(opts: { reset?: boolean } = {}): Promise<void> {
  await ensureOwnerAccount();

  if (opts.reset) {
    tx(() => {
      run("DELETE FROM payments");
      run("DELETE FROM uploads");
      run("DELETE FROM requests");
      run("DELETE FROM audit");
      run("DELETE FROM sessions");
    });
    // uploaded files are leaves; removing them keeps data/uploads honest
    try {
      for (const file of fs.readdirSync(UPLOAD_DIR)) {
        if (file.startsWith("img_")) fs.unlinkSync(path.join(UPLOAD_DIR, file));
      }
    } catch {
      /* directory may not exist yet */
    }
  } else if (hasRequests()) {
    return;
  }

  const meta = { ipHash: "demo", uaHash: "demo" };

  // 1 - brand new application, waiting for the owner
  await createRequest(
    demoBooking({
      quiz: { item: "sofa", size: "medium", stains: "light", timing: "asap", quantity: 1 },
      client: {
        name: "Анна",
        phone: "+79161112233",
        address: "Хамовники, ул. Льва Толстого, 14",
        comment: "Кот и двое детей. Нужно успеть сегодня до 18:00",
        preferredSlot: "evening",
      },
    }),
    meta,
  );

  // 2 - quote sent, waiting for the client to approve the price
  const quoted = await createRequest(
    demoBooking({
      quiz: { item: "carpet", size: "medium", stains: "heavy", timing: "week", quantity: 1 },
      client: {
        name: "Дмитрий",
        phone: "+79262223344",
        address: "Митино, Пятницкое шоссе, 25",
        comment: "Пролил красное вино на ковёр 4 м²",
        preferredSlot: "morning",
      },
    }),
    meta,
  );
  run(
    "UPDATE requests SET quote_json = ?, status = 'quote_sent', updated_at = ?, payment_json = ? WHERE id = ?",
    [
      JSON.stringify({
        price: 2890,
        note: "Выезд, химия и антиаллергенная обработка включены",
        sentAt: isoNow(),
        respondedAt: null,
        accepted: null,
      }),
      isoNow(),
      JSON.stringify({
        id: "",
        status: "pending",
        amount: 2890,
        paidAt: null,
        method: null,
        last4: null,
        receipt: null,
      }),
      quoted.request.id,
    ],
  );

  // 3 - finished and paid, with a published before/after pair
  const done = await createRequest(
    demoBooking({
      quiz: { item: "mattress", size: "large", stains: "heavy", timing: "asap", quantity: 1 },
      client: {
        name: "Ирина",
        phone: "+79033334455",
        address: "Бутово, ул. Скобелевская, 8",
        comment: "Аллергия на пыль у ребёнка",
        preferredSlot: "day",
      },
    }),
    meta,
  );

  const price = 3200;
  run(
    `UPDATE requests SET quote_json = ?, payment_json = ?, status = 'paid', updated_at = ?, timeline_json = ? WHERE id = ?`,
    [
      JSON.stringify({
        price,
        note: "Двусторонняя чистка + антиаллергенная пропитка",
        sentAt: isoNow(),
        respondedAt: isoNow(),
        accepted: true,
      }),
      JSON.stringify({
        id: "",
        status: "paid",
        amount: price,
        paidAt: isoNow(),
        method: "card",
        last4: "4242",
        receipt: `LK-DEMO-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      }),
      isoNow(),
      JSON.stringify([
        { at: isoNow(), type: "created", title: "Заявка создана", clientVisible: true },
        { at: isoNow(), type: "quote", title: "Смета согласована", note: `${price} ₽`, clientVisible: true },
        { at: isoNow(), type: "payment", title: "Оплата получена", clientVisible: true },
      ]),
      done.request.id,
    ],
  );

  const paymentId = newId("pay");
  run(
    `INSERT INTO payments (id, request_id, amount, currency, status, provider, idempotency_key, created_at, paid_at, last4, receipt, webhook_verified)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      paymentId,
      done.request.id,
      price,
      "RUB",
      "pending",
      "sandbox",
      `demo-${paymentId}`,
      isoNow(),
      null,
      null,
      null,
      0,
    ],
  );

  // Run the demo payment through the real signed-event path, so the seed also
  // proves that webhook verification + fulfilment work end to end.
  await simulateProviderWebhook({
    id: newId("evt"),
    type: "payment.succeeded",
    paymentId,
    requestId: done.request.id,
    amount: price,
    last4: "4242",
    issuedAt: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  });

  await attachDemoPhoto(done.request.id, "before", "before.png");
  await attachDemoPhoto(done.request.id, "after", "after.png");
  await setPhotosPublished(done.request.id, true, "demo-seed");
}

/** Called on boot paths: seeds once per process when DEMO_MODE is on. */
export async function ensureDemoSeed(): Promise<void> {
  if (!DEMO_MODE || seedChecked) return;
  seedChecked = true;
  try {
    await installDemoData();
  } catch {
    // A demo seed must never break the actual request.
  }
}

export function demoCounts(): { requests: number; uploads: number } {
  return {
    requests: Number(get<{ n: number }>("SELECT COUNT(*) AS n FROM requests")?.n ?? 0),
    uploads: Number(get<{ n: number }>("SELECT COUNT(*) AS n FROM uploads")?.n ?? 0),
  };
}

/** Lists the demo requests so the reset endpoint can report what was created. */
export function demoRequests(): Array<{ code: string; status: string }> {
  return all<{ code: string; status: string }>(
    "SELECT code, status FROM requests ORDER BY created_at ASC",
  ).map((r) => ({
    code: r.code,
    status: r.status,
  }));
}
