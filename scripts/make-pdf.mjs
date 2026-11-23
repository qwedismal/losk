/**
 * Renders /case/print to a real PDF with headless Chrome.
 *
 * Chrome is already installed on this machine and the page is print-optimised,
 * so no extra dependency (Puppeteer/PDFKit) is needed.
 *
 *   npm start                              # in one terminal
 *   npm run case:pdf                       # → docs/losk-case.pdf
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://localhost:3210").replace(/\/$/, "");
const OUT = path.resolve(process.env.PDF_OUT || "docs/losk-case.pdf");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

function findChrome() {
  for (const candidate of CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error("Chrome/Edge не найден. Укажите CHROME_PATH.");
    process.exit(2);
  }

  const target = `${BASE}/case/print`;
  const probe = await fetch(target).catch(() => null);
  if (!probe || !probe.ok) {
    console.error(`Страница ${target} недоступна (HTTP ${probe?.status ?? "no response"}). Запустите npm start.`);
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    "--virtual-time-budget=8000",
    `--print-to-pdf=${OUT}`,
    target,
  ];

  console.log(`Chrome: ${chrome}`);
  console.log(`Печатаем ${target} → ${OUT}`);

  await new Promise((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`chrome exit ${code}`))));
  });

  // Chrome writes the file asynchronously right before exiting; give it a moment.
  for (let i = 0; i < 20 && !fs.existsSync(OUT); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!fs.existsSync(OUT)) {
    console.error("PDF не создан");
    process.exit(1);
  }
  const size = fs.statSync(OUT).size;
  console.log(`Готово: ${OUT} (${Math.round(size / 1024)} КБ)`);
}

main().catch((err) => {
  console.error("make-pdf failed:", err.message);
  process.exit(3);
});
