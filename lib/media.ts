/**
 * Image upload validation.
 *
 * Security notes:
 * - The declared Content-Type and file name are NEVER trusted; the type is
 *   derived from magic bytes.
 * - SVG is rejected outright (it is an XSS/XXE vector when served inline).
 * - Dimensions are parsed from headers instead of decoding pixels, so a
 *   decompression-bomb image cannot exhaust memory on the server.
 * - Files are stored with a server-generated name; the original name is dropped.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export interface ImageInfo {
  mime: AllowedMime;
  ext: "jpg" | "png" | "webp" | "avif";
  width: number;
  height: number;
}

function u16(buf: Buffer, o: number) {
  return buf.readUInt16BE(o);
}
function u32(buf: Buffer, o: number) {
  return buf.readUInt32BE(o);
}

export function sniffImage(buf: Buffer): ImageInfo | null {
  if (buf.length < 16) return null;

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    if (buf.length < 24) return null;
    return { mime: "image/png", ext: "png", width: u32(buf, 16), height: u32(buf, 20) };
  }

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      const len = u16(buf, offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return {
          mime: "image/jpeg",
          ext: "jpg",
          height: u16(buf, offset + 5),
          width: u16(buf, offset + 7),
        };
      }
      offset += 2 + len;
    }
    return null;
  }

  // WEBP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const format = buf.toString("ascii", 12, 16);
    if (format === "VP8X" && buf.length >= 30) {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { mime: "image/webp", ext: "webp", width, height };
    }
    if (format === "VP8 " && buf.length >= 30) {
      return {
        mime: "image/webp",
        ext: "webp",
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (format === "VP8L" && buf.length >= 25) {
      const bits = buf.readUInt32LE(21);
      return {
        mime: "image/webp",
        ext: "webp",
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    return null;
  }

  // AVIF (ISO BMFF with ftyp brand avif/avis)
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") {
      // dimensions live in ispe boxes; fall back to 0x0 and let the UI adapt
      const ispe = buf.indexOf("ispe", 0, "ascii");
      if (ispe > 0 && ispe + 16 <= buf.length) {
        return { mime: "image/avif", ext: "avif", width: u32(buf, ispe + 8), height: u32(buf, ispe + 12) };
      }
      return { mime: "image/avif", ext: "avif", width: 0, height: 0 };
    }
  }

  return null;
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function contentDispositionInline(filename: string): string {
  return `inline; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`;
}
