import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";
import { anonCsrfOk, fail, guard, json, methodNotAllowed } from "@/lib/api";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/media";
import { PENDING_UPLOAD_TTL_MS, insertUpload, takeExpiredPendingUploads } from "@/lib/requests";
import type { Upload } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The public form accepts exactly the three formats promised in the UI. */
const CLIENT_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

const MIN_SIDE = 80;
const MAX_SIDE = 8000;
const MULTIPART_OVERHEAD = 8 * 1024;

/**
 * POST /api/requests/attachments - optional photo picked before the booking is
 * submitted.
 *
 * Why a separate endpoint instead of multipart booking: the booking itself stays
 * a small JSON body, so the offline queue, the idempotency key and the zod
 * validation keep working exactly as before. The upload returns an opaque ID;
 * the booking then claims it in the same transaction that inserts the request.
 *
 * Hardening follows the owner upload route:
 *  - rate limit, then double-submit CSRF + Origin check
 *  - byte cap enforced before and after buffering
 *  - type derived from magic bytes only; declared MIME and file name ignored
 *  - server-generated random file name inside data/uploads, path re-checked
 *  - SVG (and every non-image type) rejected, dimensions bounded
 *  - the row is created with request_id NULL: it is invisible to everyone but
 *    the owner until claimed, and it is swept if never claimed
 */
export async function POST(req: Request) {
  const limited = guard(req, "upload", "client-photo");
  if (limited) return limited;

  if (!(await anonCsrfOk(req))) {
    return fail(403, "Обновите страницу и попробуйте снова");
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return fail(415, "Ожидается файл изображения");
  }

  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD) {
    return fail(413, "Файл больше 5 МБ. Выберите фото поменьше.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Не удалось прочитать файл. Выберите другой.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "Файл не найден");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Файл больше 5 МБ. Выберите фото поменьше.");
  if (file.size < 64) return fail(400, "Файл повреждён. Выберите другой.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const info = sniffImage(bytes);
  if (!info || !(CLIENT_MIMES as readonly string[]).includes(info.mime)) {
    return fail(415, "Подходит JPEG, PNG или WebP.");
  }
  if (info.width < MIN_SIDE || info.height < MIN_SIDE) {
    return fail(422, `Фото слишком маленькое: нужно от ${MIN_SIDE} px по каждой стороне.`);
  }
  if (info.width > MAX_SIDE || info.height > MAX_SIDE) {
    return fail(422, `Фото слишком большое: до ${MAX_SIDE} px по каждой стороне.`);
  }

  const uploadId = `img_${crypto.randomUUID().replace(/-/g, "")}`;
  const fileName = `${uploadId}.${info.ext}`;
  const resolved = path.resolve(path.join(UPLOAD_DIR, fileName));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return fail(400, "Недопустимый путь");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(resolved, bytes, { mode: 0o600 });

  const upload: Upload = {
    id: uploadId,
    requestId: null,
    kind: "client",
    mime: info.mime,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: info.width,
    height: info.height,
    createdAt: new Date().toISOString(),
    file: fileName,
  };

  insertUpload(upload);
  await sweepAbandoned();

  return json(
    {
      ok: true,
      photo: { id: uploadId, mime: info.mime, width: info.width, height: info.height },
    },
    201,
  );
}

export function GET() {
  return methodNotAllowed(["POST"]);
}

/** Best-effort: abandoned uploads are removed after a day. Never blocks upload. */
async function sweepAbandoned(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - PENDING_UPLOAD_TTL_MS).toISOString();
    const expired = takeExpiredPendingUploads(cutoff);
    for (const row of expired) {
      for (const ext of ["jpg", "png", "webp"]) {
        await fs.unlink(path.join(UPLOAD_DIR, `${row.id}.${ext}`)).catch(() => {});
      }
    }
  } catch {
    /* cleanup is opportunistic */
  }
}
