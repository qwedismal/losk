/**
 * End-to-end check for the optional photo in the public booking form.
 *
 * Covers the whole chain against a running instance:
 *   anonymous form -> upload -> booking claims the photo -> SQLite row is linked
 *   -> owner logs in -> the cabinet card renders the photo -> media access rules
 *
 * Usage:
 *   node scripts/e2e-photo.mjs                     # http://127.0.0.1:3210
 *   BASE_URL=http://127.0.0.1:3211 node scripts/e2e-photo.mjs
 *   DATA_DIR=/tmp/losk-test node scripts/e2e-photo.mjs
 *
 * The instance must run with DEMO_MODE=1 and COOKIE_INSECURE=1 on plain http,
 * or be a real https deployment with the owner password known.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3210").replace(/\/$/, "");
const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DB_PATH = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(DATA_DIR, "losk.db");

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const jar = new Map();
function absorb(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const at = pair.indexOf("=");
    const name = pair.slice(0, at).trim();
    const value = pair.slice(at + 1).trim();
    if (value === "" || /max-age=0/i.test(raw)) jar.delete(name);
    else jar.set(name, value);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, pathname, { json, form, headers = {} } = {}) {
  const init = {
    method,
    headers: {
      "user-agent": "losk-e2e-photo/1.0",
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...headers,
    },
    redirect: "manual",
  };
  if (json !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(json);
  } else if (form) {
    init.body = form;
  }
  const res = await fetch(`${BASE}${pathname}`, init);
  absorb(res);
  const buf = Buffer.from(await res.arrayBuffer());
  let data = null;
  try {
    data = JSON.parse(buf.toString("utf8"));
  } catch {
    /* html/binary */
  }
  return { status: res.status, headers: res.headers, buf, text: buf.toString("utf8"), json: data };
}

function readEnv() {
  const out = {};
  for (const file of [".env.local", ".env.production"]) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    for (const line of fs.readFileSync(abs, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

async function makePng(width = 480, height = 360) {
  const { default: sharp } = await import("sharp");
  return sharp({
    create: { width, height, channels: 3, background: { r: 208, g: 198, b: 178 } },
  })
    .png()
    .toBuffer();
}

function photoForm(bytes, type = "image/png", name = "sofa.png") {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  return form;
}

async function main() {
  console.log(`\ne2e photo · ${BASE} · data ${DATA_DIR}\n`);

  /* 1. anonymous page issues the CSRF double-submit cookie */
  const home = await req("GET", "/");
  const csrf = jar.get("losk_csrf") || "";
  check("home page renders", home.status === 200 && home.text.includes("Лоск"), `status ${home.status}`);
  check("anonymous CSRF cookie issued", Boolean(csrf));

  const headers = { "x-csrf-token": csrf, "x-losk-client": "1" };

  /* 2. negative cases first: the error messages must be specific */
  const svgBytes = Buffer.from(
    "<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360'><script>alert(1)</script></svg>",
  );
  const svg = await req("POST", "/api/requests/attachments", {
    form: photoForm(svgBytes, "image/png"),
    headers,
  });
  check("SVG disguised as PNG rejected with 415", svg.status === 415, `status ${svg.status}`);

  const big = await req("POST", "/api/requests/attachments", {
    form: photoForm(Buffer.alloc(5 * 1024 * 1024 + 256, 0x88), "image/png"),
    headers,
  });
  check("file over 5 MB rejected with 413", big.status === 413, `status ${big.status}`);

  const noCsrf = await req("POST", "/api/requests/attachments", {
    form: photoForm(await makePng()),
    headers: { "x-losk-client": "1" },
  });
  check("upload without CSRF header rejected", noCsrf.status === 403, `status ${noCsrf.status}`);

  /* 3. happy path: upload */
  const png = await makePng();
  const upload = await req("POST", "/api/requests/attachments", { form: photoForm(png), headers });
  const photoId = upload.json?.photo?.id || "";
  check(
    "valid PNG uploaded and gets a server-generated id",
    upload.status === 201 && /^img_[a-f0-9]{32}$/.test(photoId),
    `status ${upload.status} id ${photoId.slice(0, 14)}`,
  );
  check(
    "upload reports real dimensions",
    upload.json?.photo?.width === 480 && upload.json?.photo?.height === 360,
    `${upload.json?.photo?.width}x${upload.json?.photo?.height}`,
  );

  /* 4. booking claims the photo */
  const booking = await req("POST", "/api/requests", {
    json: {
      clientRequestId: crypto.randomUUID(),
      quiz: { item: "sofa", size: "medium", stains: "light", timing: "week", quantity: 1 },
      client: { name: "Тест Фото", phone: "+79165550001", comment: "Проверка вложения" },
      photoIds: photoId ? [photoId] : undefined,
      website: "",
      elapsedMs: 4200,
      consent: true,
    },
    headers,
  });
  const code = booking.json?.code || "";
  const trackUrl = booking.json?.trackUrl || "";
  check("booking created with the photo", booking.status === 201 && booking.json?.photoCount === 1, `status ${booking.status} code ${code}`);
  check("booking returns a tracking link", Boolean(trackUrl));

  /* 5. the attachment is really linked in SQLite */
  let requestId = "";
  if (fs.existsSync(DB_PATH)) {
    const db = new DatabaseSync(DB_PATH, { readOnly: true });
    try {
      const row = db.prepare("SELECT id, photos_json FROM requests WHERE code = ?").get(code);
      requestId = row?.id || "";
      const photos = row ? JSON.parse(row.photos_json) : null;
      const link = photoId ? db.prepare("SELECT request_id, kind FROM uploads WHERE id = ?").get(photoId) : null;
      check("photo row belongs to the new request", Boolean(link) && link.request_id === requestId, `request_id ${link?.request_id || "null"}`);
      check("photo stored with kind=client", link?.kind === "client", `kind ${link?.kind}`);
      check(
        "photos_json contains the client photo",
        Boolean(photos?.client?.some((p) => p.id === photoId)),
        `client=${photos?.client?.length ?? 0}`,
      );
    } finally {
      db.close();
    }
  } else {
    check("SQLite file is readable for verification", false, `missing ${DB_PATH}`);
  }

  /* 6. media access: owner only */
  const anonMedia = await req("GET", `/api/media/${photoId}`);
  check("photo is not readable anonymously", anonMedia.status === 404, `status ${anonMedia.status}`);

  /* 7. owner login and cabinet rendering */
  const env = readEnv();
  const email = env.ADMIN_EMAIL || "owner@losk.ru";
  const password = env.ADMIN_PASSWORD || "";
  const login = await req("POST", "/api/auth/login", { json: { email, password } });
  check("owner login succeeds", login.status === 200, `status ${login.status} ${login.json?.error || ""}`);

  const adminHome = await req("GET", "/admin");
  check("cabinet list renders", adminHome.status === 200 && adminHome.text.includes("Заявки"), `status ${adminHome.status}`);
  check("cabinet list marks the photo", adminHome.text.includes("фото"), "");
  check("cabinet links the request", requestId ? adminHome.text.includes(`/admin/request/${requestId}`) : false, "");

  const detail = requestId ? await req("GET", `/admin/request/${requestId}`) : { status: 0, text: "" };
  check("request card renders", detail.status === 200, `status ${detail.status}`);
  check("card shows the client photo block", detail.text.includes("Фото от клиента"), "");
  check("card embeds the media URL", detail.text.includes(`/api/media/${photoId}`), "");

  const ownerMedia = await req("GET", `/api/media/${photoId}`);
  check(
    "owner can open the photo",
    ownerMedia.status === 200 && ownerMedia.headers.get("content-type") === "image/png" && ownerMedia.buf.length === png.length,
    `status ${ownerMedia.status} ${ownerMedia.headers.get("content-type")} ${ownerMedia.buf.length}B`,
  );
  check("media response is nosniff", ownerMedia.headers.get("x-content-type-options") === "nosniff", "");
  check("photo bytes match what was uploaded", ownerMedia.buf.equals(png));

  /* 8. tracking page must not leak the private photo */
  if (trackUrl) {
    const track = await req("GET", trackUrl);
    check("tracking page renders", track.status === 200, `status ${track.status}`);
    check("tracking page does not expose the photo URL", !track.text.includes(`/api/media/${photoId}`), "");
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(`\nchecks: ${checks.length}   passed: ${checks.length - failed.length}   failed: ${failed.length}`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - ${f.name} ${f.detail ? `(${f.detail})` : ""}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("e2e crashed:", err);
  process.exit(2);
});
