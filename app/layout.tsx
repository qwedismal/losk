import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { PwaProvider } from "@/components/PwaProvider";

const siteUrl = BRAND.site;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Лоск, химчистка мебели на дому в Москве",
    template: "%s · Лоск",
  },
  description:
    "Химчистка диванов, ковров и матрасов на дому в Москве. Выезд в день заявки, цена фиксируется до начала работ, гарантия 48 часов. Рассчитайте стоимость за минуту.",
  applicationName: "Лоск",
  keywords: [
    "химчистка мебели на дому",
    "химчистка дивана",
    "чистка ковра",
    "чистка матраса",
    "химчистка мебели москва",
    "калькулятор химчистки",
  ],
  authors: [{ name: BRAND.legal }],
  creator: BRAND.legal,
  publisher: BRAND.legal,
  category: "services",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: BRAND.name,
    title: "Лоск, химчистка мебели на дому в Москве",
    description:
      "Диван как из магазина за 2 часа, без выноса из квартиры. Выезд в день заявки, честная смета, гарантия 48 часов.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Лоск, химчистка мебели на дому" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Лоск, химчистка мебели на дому",
    description: "Калькулятор цены, выезд в день заявки, гарантия 48 часов.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: true, address: false, email: true },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#ffffff" },
  ],
  colorScheme: "light",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${siteUrl}/#business`,
  name: BRAND.name,
  legalName: BRAND.legal,
  description:
    "Химчистка мягкой мебели, ковров и матрасов на дому в Москве. Выезд в день заявки, гарантия 48 часов.",
  url: siteUrl,
  telephone: BRAND.phoneDisplay,
  email: BRAND.email,
  image: `${siteUrl}/og.png`,
  logo: `${siteUrl}/icons/icon-512.png`,
  priceRange: "₽₽",
  currenciesAccepted: "RUB",
  paymentAccepted: "Наличные, банковская карта",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ул. Большая Новодмитровская, 36",
    addressLocality: "Москва",
    addressCountry: "RU",
  },
  geo: { "@type": "GeoCoordinates", latitude: BRAND.geo.lat, longitude: BRAND.geo.lng },
  areaServed: { "@type": "City", name: "Москва" },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "08:00",
      closes: "22:00",
    },
  ],
  // No aggregateRating / review: the business has no collected reviews yet, and
  // invented stars are both a Google structured-data violation and a lie to the
  // visitor. The on-page reviews block ships empty and labelled instead.
  sameAs: [BRAND.telegram, BRAND.whatsapp],
};

/** JSON-LD must never be able to close its own <script> tag. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-[14px] focus:font-medium focus:text-white"
        >
          Перейти к содержимому
        </a>
        {children}
        <PwaProvider />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }}
        />
      </body>
    </html>
  );
}
