import type { Metadata } from "next";
import Link from "next/link";

import { PrintSheet } from "@/components/case/PrintSheet";
import { PrintToolbar } from "@/components/case/PrintToolbar";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: "Лоск, one-pager для печати (A4)" },
  description:
    "Одностраничная версия кейса «Лоск» для печати и PDF: что это, ключевые цифры, функции, тарифы и контакты.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/case/print" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: BRAND.name,
    url: "/case/print",
    title: "Лоск, one-pager для печати",
    description: "Кейс «Лоск» на одном листе A4: цифры, функции, тарифы, контакты.",
  },
};

export const dynamic = "force-static";

/**
 * Print rules live here (not in globals.css) so the sales page keeps its own
 * scope: A4 page box, white paper, no shadows, no site chrome, and blocks that
 * never split across pages. Physical units (pt/mm) keep the screen preview and
 * the printed sheet the same size.
 */
const PRINT_CSS = `
@page {
  size: A4;
  margin: 0;
}
@media print {
  html,
  body {
    background: #ffffff !important;
  }
  body {
    font-size: 10pt;
    line-height: 1.4;
  }
  .print-root {
    padding: 0 !important;
    min-height: 0 !important;
    background: #ffffff !important;
  }
  .print-toolbar,
  .print-hide,
  nav,
  body > footer,
  button {
    display: none !important;
  }
  .fixed,
  [role="status"],
  [role="dialog"] {
    display: none !important;
  }
  .print-sheet {
    width: 210mm !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .print-sheet,
  .print-sheet * {
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .print-sheet h1,
  .print-sheet h2,
  .print-sheet h3 {
    break-after: avoid;
    page-break-after: avoid;
  }
  .keep,
  .print-sheet section,
  .print-sheet li {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-sheet a {
    color: inherit !important;
    text-decoration: none !important;
  }
  .print-sheet img {
    max-width: 100% !important;
  }
  .print-tint,
  .print-sheet .bg-ink {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

export default function CasePrintPage() {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-root min-h-dvh bg-canvas-soft px-3 py-5 sm:px-6 sm:py-9">
        <PrintToolbar />

        <PrintSheet />

        <div className="print-hide mx-auto mt-4 w-full max-w-[210mm] text-[12px] leading-relaxed text-mute">
          <p>
            Печать: A4, масштаб 100%, поля «Нет», тогда лист занимает страницу целиком. В Chrome: «Печать» →
            «Сохранить как PDF».{" "}
            <Link href="/case" className="underline decoration-line underline-offset-2 hover:text-ink">
              Вернуться к странице кейса
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
