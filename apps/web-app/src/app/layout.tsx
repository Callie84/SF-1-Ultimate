import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { CookieBanner } from '@/components/cookie-banner';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { OnboardingModal } from '@/components/onboarding-modal';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'SeedFinderPro — Cannabis Samen Preisvergleich & Strain-Datenbank',
    template: '%s | SeedFinderPro',
  },
  description: 'Vergleiche Preise von 2800+ Cannabis Samen aus 12 Seedbanks. Strain-Datenbank, Grow-Tagebuch, Community-Forum und KI-Assistent für Grower.',
  keywords: ['cannabis samen', 'samenbank preisvergleich', 'cannabis strains', 'seeds kaufen', 'growing community', 'strain datenbank'],
  authors: [{ name: 'SeedFinderPro' }],
  creator: 'SeedFinderPro',
  metadataBase: new URL('https://seedfinderpro.de'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://seedfinderpro.de',
    siteName: 'SeedFinderPro',
    title: 'SeedFinderPro — Cannabis Samen Preisvergleich',
    description: 'Vergleiche Preise von 2800+ Cannabis Samen aus 12 Seedbanks. Kostenlos, ohne Anmeldung.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SeedFinderPro — Cannabis Samen Preisvergleich',
    description: 'Vergleiche Preise von 2800+ Cannabis Samen aus 12 Seedbanks.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <Script
          defer
          data-domain="seedfinderpro.de"
          src="https://analytics.seedfinderpro.de/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          themes={['light', 'dark', 'theme-nature', 'theme-midnight', 'theme-earth', 'theme-neon']}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <CookieBanner />
              <PwaInstallPrompt />
              <OnboardingModal />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
