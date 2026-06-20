import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';

import { Geist, Geist_Mono, Montserrat } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import './globals.css';

const _geist = Geist({ subsets: ['latin', 'latin-ext'] });
const _geistMono = Geist_Mono({ subsets: ['latin', 'latin-ext'] });
const _montserrat = Montserrat({ subsets: ['latin', 'latin-ext'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'Motil - Plataforma Operacional Minera',
  description:
    'Plataforma operacional minera para conectar producción, mantención, bodega, HSE, documentos y gerencia con trazabilidad operacional y KPIs en tiempo real.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          {children}
          <Toaster position="top-right" />
          {/* Analytics disabled in dev mode - causes script tag error. Re-enable for production. */}
          {/* {process.env.NODE_ENV === 'production' && <Analytics />} */}
        </ThemeProvider>
      </body>
    </html>
  );
}
