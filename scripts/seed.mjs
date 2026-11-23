/**
 * Seed / reset the demo dataset through the running server.
 *
 * The demo data lives in SQLite and is normally installed automatically on first
 * boot when DEMO_MODE=1. This script exists for the "I want it now" case and for
 * CI: it uses the same one-click demo login + reset endpoint the UI uses, so it
 * also proves that those endpoints work.
 *
 *   npm start            # in one terminal
 *   npm run seed         # in another
 */
import fs from "node:fs";

const BASE = (process.env.BASE_URL || "http://localhost:3210").replace(/\/$/, "");

function env() {
  const file = ".env.local";
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function main() {
  const vars = env();
  const demo = vars.DEMO_MODE === "1" || vars.DEMO_MODE === "true";

  const health = await fetch(`${BASE}/`).catch(() => null);
  if (!health || !health.ok) {
    console.error(`Сервер не отвечает на ${BASE}. Запустите: npm start`);
    process.exit(2);
  }

  if (!demo) {
    console.error("DEMO_MODE выключен в .env.local — сид не требуется, данные создаются заявками.");
    process.exit(1);
  }

  // 1. one-click demo login (sets the session cookie)
  const login = await fetch(`${BASE}/api/demo/login`, { method: "POST" });
  if (!login.ok) {
    console.error(`Не удалось войти в демо: HTTP ${login.status}`);
    process.exit(1);
  }
  const cookie = (login.headers.getSetCookie() ?? []).map((c) => c.split(";")[0]).join("; ");

  // 2. session-bound CSRF token
  const session = await fetch(`${BASE}/api/auth/session`, { headers: { cookie } });
  const data = await session.json().catch(() => null);
  if (!data?.csrfToken) {
    console.error("Не удалось получить CSRF-токен");
    process.exit(1);
  }

  // 3. rebuild the demo dataset
  const reset = await fetch(`${BASE}/api/demo/reset`, {
    method: "POST",
    headers: { cookie, "x-csrf-token": data.csrfToken, "x-losk-client": "1" },
  });
  const result = await reset.json().catch(() => null);
  if (!reset.ok) {
    console.error(`Сброс не удался: HTTP ${reset.status} ${result?.error ?? ""}`);
    process.exit(1);
  }

  console.log(`Готово: ${result.requests} заявки, ${result.uploads} фото.`);
  console.log("Демо-кабинет: " + BASE + "/admin");
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(3);
});
