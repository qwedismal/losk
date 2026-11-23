import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { UPLOAD_DIR } from "@/lib/db";
import { isUploadPublic, findUpload } from "@/lib/requests";
import { resolveSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SAFE_FILE = /^img_[A-Za-z0-9]+\.(jpg|png|webp|avif)$/;

/**
 * GET /api/media/[id] - serves uploaded photos.
 *
 * Authorisation model (never trust the ID alone):
 *   - the owner session can read everything
 *   - anonymous readers only get photos that belong to a request whose
 *     `photos.published` flag is on (the public before/after gallery)
 *   - every miss returns 404 rather than 403, so the endpoint cannot be used
 *     to enumerate which photo IDs exist
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^img_[A-Za-z0-9]{1,64}$/.test(id)) return notFound();

  const upload = findUpload(id);
  if (!upload) return notFound();
  if (!SAFE_FILE.test(upload.file)) return notFound();

  const jar = await cookies();
  const session = await resolveSession(jar.get(SESSION_COOKIE)?.value);
  const isOwner = session?.user.role === "owner";

  if (!isOwner && !isUploadPublic(upload)) return notFound();

  const abs = path.resolve(path.join(UPLOAD_DIR, upload.file));
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return notFound();

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(abs);
  } catch {
    return notFound();
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": upload.mime,
      "content-length": String(bytes.length),
      "cache-control": isOwner ? "private, no-store" : "public, max-age=300, s-maxage=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename="${upload.file}"`,
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
