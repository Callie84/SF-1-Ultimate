import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';
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
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
