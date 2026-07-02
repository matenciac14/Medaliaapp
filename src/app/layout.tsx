import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { getServerLocale } from "@/lib/i18n/server";
import Providers from "./_components/Providers";
import ServiceWorkerRegistration from "./_components/ServiceWorkerRegistration";
import CookieConsent from "./_components/CookieConsent";

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

const META_TITLE = 'Medaliq — Coaching deportivo inteligente'
const META_DESCRIPTION = 'La plataforma de coaching deportivo para LatAm. Planes periodizados, nutrición y seguimiento en tiempo real.'
const META_URL = 'https://medaliq.com'
const META_IMAGE = 'https://medaliq.com/og-image.png'

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Medaliq',
    startupImage: [],
  },
  formatDetection: { telephone: false },
  alternates: {
    canonical: META_URL,
    languages: {
      'es': META_URL,
      'en': META_URL,
      'pt': META_URL,
    },
  },
  openGraph: {
    type: 'website',
    url: META_URL,
    title: META_TITLE,
    description: META_DESCRIPTION,
    siteName: 'Medaliq',
    images: [{ url: META_IMAGE, width: 1200, height: 630, alt: 'Medaliq — Coaching deportivo inteligente' }],
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
      <body className="min-h-full flex flex-col">
        <Providers initialLocale={locale}>
          {children}
        </Providers>
        <ServiceWorkerRegistration />
        <CookieConsent />
      </body>
    </html>
  );
}
