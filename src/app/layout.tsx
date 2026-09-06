import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { getServerLocale } from "@/lib/i18n/server";
import Providers from "./_components/Providers";
import ServiceWorkerRegistration from "./_components/ServiceWorkerRegistration";
import CookieConsent from "./_components/CookieConsent";
import { JsonLd } from "@/components/seo/json_ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const META_TITLE = 'Medaliq — Plataforma de coaching y tracking deportivo para LatAm'
const META_DESCRIPTION = 'Gestiona tus atletas desde un solo panel. Planes periodizados, nutricion personalizada con Mifflin-St Jeor, zonas de FC con Karvonen y seguimiento semanal. Gratis para coaches con hasta 5 atletas.'
const META_URL = 'https://medaliq.com'
const META_IMAGE = 'https://medaliq.com/opengraph-image'

export const metadata: Metadata = {
  title: {
    default: META_TITLE,
    template: '%s | Medaliq',
  },
  description: META_DESCRIPTION,
  keywords: [
    'coaching deportivo', 'tracking deportivo', 'plataforma para entrenadores',
    'planes periodizados', 'nutricion deportiva', 'gestion de atletas',
    'software para coaches', 'running', 'fuerza', 'ejercicios',
    'Karvonen', 'Mifflin-St Jeor', 'macros', 'TDEE',
    'entrenador personal', 'LatAm', 'Colombia', 'Mexico',
    'app para entrenadores', 'seguimiento deportivo',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/brand/svg/medaliq-favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/png/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/png/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/png/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Medaliq',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  formatDetection: { telephone: false },
  alternates: {
    canonical: META_URL,
    languages: {
      'es': META_URL,
      'en': `${META_URL}?lang=en`,
      'pt': `${META_URL}?lang=pt`,
    },
  },
  openGraph: {
    type: 'website',
    url: META_URL,
    title: META_TITLE,
    description: META_DESCRIPTION,
    siteName: 'Medaliq',
    locale: 'es_CO',
    images: [{ url: META_IMAGE, width: 1200, height: 630, alt: 'Medaliq — Plataforma de coaching y tracking deportivo para entrenadores y atletas en LatAm' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [META_IMAGE],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1e3a5f',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale()
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt — Medaliq product info for AI" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Medaliq',
          url: META_URL,
          description: META_DESCRIPTION,
          inLanguage: ['es', 'en', 'pt'],
          potentialAction: {
            '@type': 'SearchAction',
            target: `${META_URL}/coaches?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }} />
        <Providers initialLocale={locale}>
          {children}
        </Providers>
        <ServiceWorkerRegistration />
        <CookieConsent />
      </body>
    </html>
  );
}
