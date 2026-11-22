import type { Metadata, Viewport } from 'next';
import './globals.css';
import { EngineInitializer } from '@/components/EngineInitializer';
import { PWAStatusBanner } from '@/components/common/PWAStatusBanner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5'
};

export const metadata: Metadata = {
  metadataBase: new URL('https://gatc.vercel.app'),
  title: {
    default: 'GATC — Gestor de Análisis para Tendidos y Costos',
    template: '%s | GATC CAD'
  },
  description:
    'Software CAD en la nube para el diseño arquitectónico y cálculo de instalaciones eléctricas residenciales, cómputo métrico de materiales (BOM) y generación de planos en PDF.',
  keywords: [
    'CAD electrico',
    'planos electricos',
    'tendidos y costos',
    'computo metrico BOM',
    'instalaciones residenciales',
    'PWA CAD',
    'software electricidad'
  ],
  authors: [{ name: 'GATC Engineering Team' }],
  creator: 'GATC',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.svg'
  },
  openGraph: {
    type: 'website',
    locale: 'es_GT',
    url: 'https://gatc.vercel.app',
    title: 'GATC — Gestor de Análisis para Tendidos y Costos',
    description:
      'Diseña planos eléctricos residenciales, calcula tuberías, conductores y accesorios automáticamente con cómputo métrico en tiempo real.',
    siteName: 'GATC CAD',
    images: [
      {
        url: '/icons/icon-512.svg',
        width: 512,
        height: 512,
        alt: 'GATC CAD Icon'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'GATC — Gestor de Análisis para Tendidos y Costos',
    description:
      'Diseña planos eléctricos y genera presupuestos automáticos con motor CAD 2D/3D en el navegador.',
    images: ['/icons/icon-512.svg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GATC'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen selection:bg-indigo-500/30">
        <EngineInitializer />
        {children}
        <PWAStatusBanner />
      </body>
    </html>
  );
}
