import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";
import { fail, guard, json, requireOwner } from "@/lib/api";
import { addPhoto, findById, insertUpload, removePhoto } from "@/lib/requests";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/media";
import type { PhotoRef, Upload } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/requests/[id]/photos - multipart upload of a before/after photo.
 *
 * Hardening:
 *  - owner session + CSRF required
 *  - hard byte cap enforced BEFORE buffering (content-length) and after
 *  - type derived from magic bytes, original filename discarded
 *  - random server-side filename inside data/uploads (never user-controlled)
 *  - SVG and every non-image type rejected
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;

  const limited = guard(req, "upload", "photos");
  if (limited) return limited;

  const { id } = await ctx.params;
  const request = await findById(id);
  if (!request) return fail(404, "Заявка не найдена");

  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > MAX_UPLOAD_BYTES + 4096) return fail(413, "Файл больше 5 МБ");

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) return fail(415, "Ожидается multipart/form-data");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Не удалось прочитать файл");
  }

  const file = form.get("file");
  const kindRaw = String(form.get("kind") || "");
  if (!(file instanceof File)) return fail(400, "Файл не найден");
  if (kindRaw !== "before" && kindRaw !== "after") return fail(400, "Неверный тип фото");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "Файл больше 5 МБ");
  if (file.size < 64) return fail(400, "Файл повреждён");

  const bytes = Buffer.from(await file.arrayBuffer());
  const info = sniffImage(bytes);
  if (!info) return fail(415, "Поддерживаются только JPEG, PNG, WebP, AVIF");
  if (info.width < 120 || info.height < 120) return fail(422, "Слишком маленькое изображение");
  if (info.width > 8000 || info.height > 8000) return fail(422, "Слишком большое изображение");

  const uploadId = `img_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  const fileName = `${uploadId}.${info.ext}`;
  const abs = path.join(UPLOAD_DIR, fileName);

  // path traversal guard: the resolved path must stay inside the upload dir
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return fail(400, "Недопустимый путь");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(resolved, bytes, { mode: 0o600 });

  const upload: Upload = {
    id: uploadId,
    requestId: id,
    kind: kindRaw,
    mime: info.mime,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    width: info.width,
    height: info.height,
    createdAt: new Date().toISOString(),
    file: fileName,
  };

  insertUpload(upload);

  const ref: PhotoRef = {
    id: uploadId,
    kind: kindRaw,
    mime: info.mime,
    width: info.width,
    height: info.height,
    createdAt: upload.createdAt,
    caption: String(form.get("caption") || "").slice(0, 120) || undefined,
  };

  const updated = await addPhoto(id, ref, auth.ctx.session.user.email);
  return json({ ok: true, photo: ref, photos: updated?.photos });
}

/** DELETE /api/admin/requests/[id]/photos?photoId=... */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner(req);
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const photoId = new URL(req.url).searchParams.get("photoId") || "";
  if (!/^img_[A-Za-z0-9]{1,64}$/.test(photoId)) {
    // IDs are server-generated; anything else is a probe.
    return fail(400, "Некорректный идентификатор");
  }

  const request = await findById(id);
  if (!request) return fail(404, "Заявка не найдена");

  const belongs =
    request.photos.before.some((p) => p.id === photoId) ||
    request.photos.after.some((p) => p.id === photoId) ||
    request.photos.client.some((p) => p.id === photoId);
  if (!belongs) return fail(404, "Фото не найдено");

  const removed = await removePhoto(id, photoId, auth.ctx.session.user.email);

  if (removed) {
    // best-effort unlink; the metadata is already gone
    const prefix = path.join(UPLOAD_DIR, removed);
    for (const ext of ["jpg", "png", "webp", "avif"]) {
      await fs.unlink(`${prefix}.${ext}`).catch(() => {});
    }
  }

  return json({ ok: true });
}
