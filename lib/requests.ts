import { all, get, isoNow, newId, parseJson, run, tx, type SqlParam } from "./db";
import { logAudit } from "./audit";
import { publicCode, secretToken } from "./ids";
import { calculate, getItem } from "./pricing";
import type { BookingInput } from "./validate";
import { maskPhone } from "./validate";
import type {
  ClientInfo,
  Estimate,
  PhotoRef,
  PublicRequest,
  QuizAnswers,
  Quote,
  RequestPhotos,
  RequestStatus,
  ServiceRequest,
  TimelineEntry,
  Upload,
} from "./types";

/* ---------------------------------------------------------------------------
   Request lifecycle on top of SQLite. Every state change is a single
   transaction: the row update and its timeline entry can never diverge.
   --------------------------------------------------------------------------- */

const CLIENT_TITLE: Record<RequestStatus, string> = {
  new: "Заявка принята",
  contacted: "Мы связались с вами",
  quote_sent: "Смета согласована",
  confirmed: "Мастер назначен",
  done: "Работа выполнена",
  awaiting_payment: "Ожидается оплата",
  paid: "Оплачено",
  closed: "Заявка закрыта",
  cancelled: "Заявка отменена",
};

interface RequestRow {
  id: string;
  client_request_id: string | null;
  code: string;
  track_token: string;
  pay_token: string;
  status: RequestStatus;
  client_name: string;
  client_phone: string;
  client_json: string;
  quiz_json: string;
  estimate_json: string;
  quote_json: string;
  payment_json: string | null;
  photos_json: string;
  photos_published: number;
  timeline_json: string;
  source: string;
  ip_hash: string;
  ua_hash: string;
  created_at: string;
  updated_at: string;
}

export function emptyPhotos(): RequestPhotos {
  return { before: [], after: [], client: [], published: false };
}

/**
 * Older rows were written before the `client` bucket existed. Normalise on read
 * instead of migrating data: the JSON column stays backward compatible.
 */
export function normalizePhotos(raw: unknown): RequestPhotos {
  const source = (raw ?? {}) as Partial<RequestPhotos>;
  return {
    before: Array.isArray(source.before) ? source.before : [],
    after: Array.isArray(source.after) ? source.after : [],
    client: Array.isArray(source.client) ? source.client : [],
    published: source.published === true,
  };
}

function mapRequest(row: RequestRow): ServiceRequest {
  const photos = normalizePhotos(parseJson(row.photos_json, null));
  return {
    id: row.id,
    code: row.code,
    trackToken: row.track_token,
    payToken: row.pay_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    client: parseJson<ClientInfo>(row.client_json, { name: row.client_name, phone: row.client_phone }),
    quiz: parseJson<QuizAnswers>(row.quiz_json, {
      item: "sofa",
      size: "small",
      stains: "none",
      timing: "week",
      quantity: 1,
    }),
    estimate: parseJson<Estimate>(row.estimate_json, {
      from: 0,
      to: 0,
      currency: "RUB",
      lines: [],
      durationMin: 60,
    }),
    quote: parseJson<Quote>(row.quote_json, {
      price: null,
      note: "",
      sentAt: null,
      respondedAt: null,
      accepted: null,
    }),
    payment: row.payment_json ? parseJson(row.payment_json, null) : null,
    photos: { ...photos, published: row.photos_published === 1 },
    timeline: parseJson<TimelineEntry[]>(row.timeline_json, []),
    source: "site",
    ipHash: row.ip_hash,
    userAgentHash: row.ua_hash,
  };
}

const SELECT_ONE = "SELECT * FROM requests WHERE ";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createRequest(
  input: BookingInput,
  meta: { ipHash: string; uaHash: string },
  clientRequestId?: string,
): Promise<{ request: ServiceRequest; duplicate: boolean }> {
  // Idempotency: an offline retry with the same client key must not duplicate.
  if (clientRequestId) {
    const existing = get<RequestRow>(`${SELECT_ONE}client_request_id = ?`, [clientRequestId]);
    if (existing) return { request: mapRequest(existing), duplicate: true };
  }

  const estimate = calculate(input.quiz);
  const client: ClientInfo = {
    name: input.client.name,
    phone: input.client.phone,
    address: input.client.address || undefined,
    district: input.client.district || undefined,
    comment: input.client.comment || undefined,
    preferredDate: input.client.preferredDate || undefined,
    preferredSlot: input.client.preferredSlot,
  };

  const now = isoNow();
  const photos = emptyPhotos();
  const row: RequestRow = {
    id: newId("req"),
    client_request_id: clientRequestId ?? null,
    code: publicCode(),
    track_token: secretToken(),
    pay_token: secretToken(),
    status: "new",
    client_name: client.name,
    client_phone: client.phone,
    client_json: JSON.stringify(client),
    quiz_json: JSON.stringify(input.quiz),
    estimate_json: JSON.stringify(estimate),
    quote_json: JSON.stringify({ price: null, note: "", sentAt: null, respondedAt: null, accepted: null }),
    payment_json: null,
    photos_json: JSON.stringify(photos),
    photos_published: 0,
    timeline_json: JSON.stringify([
      {
        at: now,
        type: "created",
        title: "Заявка создана",
        note: `${getItem(input.quiz.item).label} · примерная стоимость ${estimate.from.toLocaleString("ru-RU")} ₽`,
        clientVisible: true,
      },
    ]),
    source: "site",
    ip_hash: meta.ipHash,
    ua_hash: meta.uaHash,
    created_at: now,
    updated_at: now,
  };

  tx(() => {
    run(
      `INSERT INTO requests
       (id,client_request_id,code,track_token,pay_token,status,client_name,client_phone,client_json,quiz_json,
        estimate_json,quote_json,payment_json,photos_json,photos_published,timeline_json,source,ip_hash,ua_hash,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        row.id,
        row.client_request_id,
        row.code,
        row.track_token,
        row.pay_token,
        row.status,
        row.client_name,
        row.client_phone,
        row.client_json,
        row.quiz_json,
        row.estimate_json,
        row.quote_json,
        null,
        row.photos_json,
        0,
        row.timeline_json,
        row.source,
        row.ip_hash,
        row.ua_hash,
        row.created_at,
        row.updated_at,
      ],
    );

    // Attach the optional photos the client uploaded before submitting.
    const attached = claimClientPhotos(row.id, input.photoIds);
    if (attached.length > 0) {
      photos.client = attached;
      row.photos_json = JSON.stringify(photos);
      pushTimeline(row, {
        at: now,
        type: "photos",
        title: "Клиент приложил фото",
        note: attached.length === 1 ? "Фото в карточке заявки" : `Фото: ${attached.length}`,
        clientVisible: true,
      });
      run("UPDATE requests SET photos_json = ?, timeline_json = ? WHERE id = ?", [
        row.photos_json,
        row.timeline_json,
        row.id,
      ]);
    }
  });

  logAudit({
    actor: "client",
    action: "request.created",
    target: row.code,
    meta: { from: estimate.from, item: input.quiz.item },
    ipHash: meta.ipHash,
  });

  return { request: mapRequest(row), duplicate: false };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Synchronous read - SQLite is synchronous, and callers inside a transaction
 *  cannot await without breaking atomicity. */
export function findByIdSync(id: string): ServiceRequest | null {
  const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
  return row ? mapRequest(row) : null;
}

export async function findById(id: string): Promise<ServiceRequest | null> {
  return findByIdSync(id);
}

export async function findByTrackToken(token: string): Promise<ServiceRequest | null> {
  if (!token || token.length < 16 || token.length > 120) return null;
  const row = get<RequestRow>(`${SELECT_ONE}track_token = ?`, [token]);
  return row ? mapRequest(row) : null;
}

export async function findByPayToken(token: string): Promise<ServiceRequest | null> {
  if (!token || token.length < 16 || token.length > 120) return null;
  const row = get<RequestRow>(`${SELECT_ONE}pay_token = ?`, [token]);
  return row ? mapRequest(row) : null;
}

export async function findByCodeAndPhone(code: string, phone: string): Promise<ServiceRequest | null> {
  const row = get<RequestRow>(`${SELECT_ONE}code = ? COLLATE NOCASE AND client_phone = ?`, [code, phone]);
  return row ? mapRequest(row) : null;
}

export async function listRequests(limit = 300): Promise<ServiceRequest[]> {
  return all<RequestRow>("SELECT * FROM requests ORDER BY created_at DESC LIMIT ?", [limit]).map(mapRequest);
}

export interface RequestStats {
  total: number;
  newCount: number;
  activeCount: number;
  awaitingPayment: number;
  paidRevenue: number;
  todayCount: number;
}

export async function requestStats(): Promise<RequestStats> {
  const total = Number(get<{ n: number }>("SELECT COUNT(*) AS n FROM requests")?.n ?? 0);
  const newCount = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM requests WHERE status = 'new'")?.n ?? 0,
  );
  const activeCount = Number(
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM requests WHERE status IN ('contacted','quote_sent','confirmed','done','awaiting_payment')`,
    )?.n ?? 0,
  );
  const awaitingPayment = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM requests WHERE status = 'awaiting_payment'")?.n ?? 0,
  );
  const paidRevenue = Number(
    get<{ n: number }>("SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE status = 'paid'")?.n ?? 0,
  );
  const todayCount = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM requests WHERE created_at >= ?")?.n ?? 0,
  );

  return { total, newCount, activeCount, awaitingPayment, paidRevenue, todayCount };
}

export async function countToday(): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM requests WHERE created_at >= ?", [start.toISOString()])
      ?.n ?? 0,
  );
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

export function toPublic(request: ServiceRequest): PublicRequest {
  return {
    code: request.code,
    createdAt: request.createdAt,
    status: request.status,
    quiz: request.quiz,
    estimate: request.estimate,
    client: {
      name: request.client.name,
      phoneMasked: maskPhone(request.client.phone),
      address: request.client.address,
    },
    quote: {
      price: request.quote.price,
      note: request.quote.note,
      sentAt: request.quote.sentAt,
      accepted: request.quote.accepted,
    },
    payment: request.payment
      ? {
          status: request.payment.status,
          amount: request.payment.amount,
          paidAt: request.payment.paidAt,
          receipt: request.payment.receipt,
        }
      : null,
    photos: request.photos,
    timeline: request.timeline.filter((t) => t.clientVisible),
    payUrl: request.quote.price && request.quote.price > 0 ? `/pay/${request.payToken}` : null,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function pushTimeline(row: RequestRow, entry: TimelineEntry): void {
  const timeline = parseJson<TimelineEntry[]>(row.timeline_json, []);
  timeline.push(entry);
  row.timeline_json = JSON.stringify(timeline);
}

export async function updateStatus(
  id: string,
  status: RequestStatus,
  opts: { note?: string; actor: string },
): Promise<ServiceRequest | null> {
  const updated = tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;
    const from = row.status;
    row.status = status;
    row.updated_at = isoNow();
    pushTimeline(row, {
      at: row.updated_at,
      type: "status",
      title: CLIENT_TITLE[status],
      note: opts.note || undefined,
      clientVisible: true,
    });
    run("UPDATE requests SET status = ?, updated_at = ?, timeline_json = ? WHERE id = ?", [
      row.status,
      row.updated_at,
      row.timeline_json,
      id,
    ]);
    logAudit({ actor: opts.actor, action: "request.status", target: row.code, meta: { from, to: status } });
    return mapRequest(row);
  });
  return updated;
}

export async function setQuote(
  id: string,
  price: number,
  note: string,
  actor: string,
): Promise<ServiceRequest | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    const quote: Quote = { price, note, sentAt: isoNow(), respondedAt: null, accepted: null };
    const payment = {
      id: "",
      status: "pending" as const,
      amount: price,
      paidAt: null,
      method: null,
      last4: null,
      receipt: null,
    };
    row.quote_json = JSON.stringify(quote);
    row.payment_json = JSON.stringify(payment);
    row.status = "quote_sent";
    row.updated_at = isoNow();
    pushTimeline(row, {
      at: row.updated_at,
      type: "quote",
      title: "Смета согласована",
      note: `${price.toLocaleString("ru-RU")} ₽${note ? ` · ${note}` : ""}`,
      clientVisible: true,
    });

    run(
      "UPDATE requests SET quote_json = ?, payment_json = ?, status = ?, updated_at = ?, timeline_json = ? WHERE id = ?",
      [row.quote_json, row.payment_json, row.status, row.updated_at, row.timeline_json, id],
    );
    logAudit({ actor, action: "request.quote", target: row.code, meta: { price } });
    return mapRequest(row);
  });
}

export async function respondToQuote(
  id: string,
  accepted: boolean,
  comment: string | undefined,
): Promise<ServiceRequest | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    const quote = parseJson<Quote>(row.quote_json, {
      price: null,
      note: "",
      sentAt: null,
      respondedAt: null,
      accepted: null,
    });
    if (!quote.sentAt || !quote.price) return null;
    if (quote.accepted !== null) return null;

    quote.accepted = accepted;
    quote.respondedAt = isoNow();
    row.quote_json = JSON.stringify(quote);
    row.status = accepted ? "confirmed" : "contacted";
    row.updated_at = isoNow();
    pushTimeline(row, {
      at: row.updated_at,
      type: "quote_response",
      title: accepted ? "Клиент согласовал смету" : "Клиент просит уточнить смету",
      note: comment || undefined,
      clientVisible: true,
    });

    run("UPDATE requests SET quote_json = ?, status = ?, updated_at = ?, timeline_json = ? WHERE id = ?", [
      row.quote_json,
      row.status,
      row.updated_at,
      row.timeline_json,
      id,
    ]);
    logAudit({ actor: "client", action: accepted ? "quote.accepted" : "quote.declined", target: row.code });
    return mapRequest(row);
  });
}

export async function addPhoto(id: string, photo: PhotoRef, actor: string): Promise<ServiceRequest | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    const photos = normalizePhotos(parseJson(row.photos_json, null));
    if (photo.kind === "before") photos.before.push(photo);
    else if (photo.kind === "after") photos.after.push(photo);
    else photos.client.push(photo);

    row.photos_json = JSON.stringify(photos);
    row.updated_at = isoNow();
    pushTimeline(row, {
      at: row.updated_at,
      type: "photos",
      title:
        photo.kind === "before"
          ? "Добавлено фото «до»"
          : photo.kind === "after"
            ? "Добавлено фото «после»"
            : "Добавлено фото",
      clientVisible: row.photos_published === 1,
    });

    run("UPDATE requests SET photos_json = ?, updated_at = ?, timeline_json = ? WHERE id = ?", [
      row.photos_json,
      row.updated_at,
      row.timeline_json,
      id,
    ]);
    logAudit({ actor, action: "request.photo.add", target: row.code });
    return mapRequest(row);
  });
}

export async function removePhoto(id: string, photoId: string, actor: string): Promise<string | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    const photos = normalizePhotos(parseJson(row.photos_json, null));
    let removed = false;
    const strip = (list: PhotoRef[]) =>
      list.filter((p) => {
        if (p.id === photoId) {
          removed = true;
          return false;
        }
        return true;
      });
    photos.before = strip(photos.before);
    photos.after = strip(photos.after);
    photos.client = strip(photos.client);
    if (!removed) return null;

    run("UPDATE requests SET photos_json = ?, updated_at = ? WHERE id = ?", [
      JSON.stringify(photos),
      isoNow(),
      id,
    ]);
    run("DELETE FROM uploads WHERE id = ?", [photoId]);
    logAudit({ actor, action: "request.photo.delete", target: row.code });
    return photoId;
  });
}

export async function setPhotosPublished(
  id: string,
  published: boolean,
  actor: string,
): Promise<ServiceRequest | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    const photos = normalizePhotos(parseJson(row.photos_json, null));
    photos.published = published;
    row.photos_json = JSON.stringify(photos);
    row.photos_published = published ? 1 : 0;
    row.updated_at = isoNow();

    run("UPDATE requests SET photos_json = ?, photos_published = ?, updated_at = ? WHERE id = ?", [
      row.photos_json,
      row.photos_published,
      row.updated_at,
      id,
    ]);
    logAudit({ actor, action: "request.photos.publish", target: row.code, meta: { published } });
    return mapRequest(row);
  });
}

export async function addNote(id: string, text: string, actor: string): Promise<ServiceRequest | null> {
  return tx(() => {
    const row = get<RequestRow>(`${SELECT_ONE}id = ?`, [id]);
    if (!row) return null;

    row.updated_at = isoNow();
    pushTimeline(row, {
      at: row.updated_at,
      type: "note",
      title: "Заметка",
      note: text,
      clientVisible: false,
    });
    run("UPDATE requests SET updated_at = ?, timeline_json = ? WHERE id = ?", [
      row.updated_at,
      row.timeline_json,
      id,
    ]);
    logAudit({ actor, action: "request.note", target: row.code });
    return mapRequest(row);
  });
}

// ---------------------------------------------------------------------------
// Gallery / uploads
// ---------------------------------------------------------------------------

export interface GalleryItem {
  code: string;
  item: QuizAnswers["item"];
  size: QuizAnswers["size"];
  before: PhotoRef | null;
  after: PhotoRef | null;
}

export async function publishedGallery(limit = 6): Promise<GalleryItem[]> {
  const rows = all<RequestRow>(
    "SELECT * FROM requests WHERE photos_published = 1 ORDER BY updated_at DESC LIMIT ?",
    [limit],
  );
  return rows
    .map((row) => {
      const request = mapRequest(row);
      return {
        code: request.code,
        item: request.quiz.item,
        size: request.quiz.size,
        before: request.photos.before[0] ?? null,
        after: request.photos.after[0] ?? null,
      };
    })
    .filter((g) => g.after !== null);
}

interface UploadRow {
  id: string;
  request_id: string | null;
  kind: string;
  mime: string;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  file: string;
  created_at: string;
}

function mapUpload(row: UploadRow): Upload {
  return {
    id: row.id,
    requestId: row.request_id,
    kind: row.kind as Upload["kind"],
    mime: row.mime,
    bytes: Number(row.bytes),
    sha256: row.sha256,
    width: Number(row.width),
    height: Number(row.height),
    createdAt: row.created_at,
    file: row.file,
  };
}

export function findUpload(id: string): Upload | null {
  const row = get<UploadRow>("SELECT * FROM uploads WHERE id = ?", [id]);
  return row ? mapUpload(row) : null;
}

export function insertUpload(upload: Upload): void {
  run(
    `INSERT INTO uploads (id,request_id,kind,mime,bytes,sha256,width,height,file,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      upload.id,
      upload.requestId,
      upload.kind,
      upload.mime,
      upload.bytes,
      upload.sha256,
      upload.width,
      upload.height,
      upload.file,
      upload.createdAt,
    ],
  );
}

export function deleteUploadRow(id: string): void {
  run("DELETE FROM uploads WHERE id = ?", [id]);
}

/**
 * How long an upload may sit unclaimed before the next upload sweeps it.
 * A client who picks a photo and closes the tab must not leave files forever.
 */
export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Bind anonymous pending uploads to a freshly created request.
 * Unknown, already-claimed or expired IDs are skipped: a lost photo must never
 * block a booking.
 */
function claimClientPhotos(requestId: string, photoIds: string[] | undefined): PhotoRef[] {
  if (!photoIds || photoIds.length === 0) return [];
  const cutoff = new Date(Date.now() - PENDING_UPLOAD_TTL_MS).toISOString();
  const claimed: PhotoRef[] = [];

  for (const id of photoIds.slice(0, 2)) {
    const up = get<UploadRow>(
      "SELECT * FROM uploads WHERE id = ? AND request_id IS NULL AND kind = 'client'",
      [id],
    );
    if (!up || up.created_at < cutoff) continue;
    const changed = run("UPDATE uploads SET request_id = ? WHERE id = ? AND request_id IS NULL", [
      requestId,
      id,
    ]);
    if (changed !== 1) continue;
    claimed.push({
      id,
      kind: "client",
      mime: up.mime,
      width: Number(up.width),
      height: Number(up.height),
      createdAt: up.created_at,
    });
  }

  return claimed;
}

/**
 * Remove abandoned pending uploads (rows + their file names, so the caller can
 * unlink). Bounded: this runs on a public endpoint, never unbounded work.
 */
export function takeExpiredPendingUploads(cutoffIso: string, limit = 25): { id: string; file: string }[] {
  return tx(() => {
    const rows = all<{ id: string; file: string }>(
      "SELECT id, file FROM uploads WHERE request_id IS NULL AND kind = 'client' AND created_at < ? LIMIT ?",
      [cutoffIso, limit],
    );
    for (const row of rows) run("DELETE FROM uploads WHERE id = ? AND request_id IS NULL", [row.id]);
    return rows;
  });
}

/** True when the upload belongs to a request that is published to the public. */
export function isUploadPublic(upload: Upload): boolean {
  if (!upload.requestId) return false;
  const row = get<{ photos_published: number; photos_json: string }>(
    "SELECT photos_published, photos_json FROM requests WHERE id = ?",
    [upload.requestId],
  );
  if (!row || Number(row.photos_published) !== 1) return false;
  const photos = normalizePhotos(parseJson(row.photos_json, null));
  return photos.before.some((p) => p.id === upload.id) || photos.after.some((p) => p.id === upload.id);
}

/** SQL LIKE search for the owner's list (code, name, phone). */
export async function searchRequests(query: string, limit = 50): Promise<ServiceRequest[]> {
  const q = `%${query.replace(/[%_]/g, "")}%`;
  return all<RequestRow>(
    `SELECT * FROM requests
     WHERE code LIKE ? OR client_name LIKE ? OR client_phone LIKE ?
     ORDER BY created_at DESC LIMIT ?`,
    [q, q, q, limit] as SqlParam[],
  ).map(mapRequest);
}
