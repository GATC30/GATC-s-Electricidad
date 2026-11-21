import type { Metadata } from 'next';
import './globals.css';
import { EngineInitializer } from '@/components/EngineInitializer';

export const metadata: Metadata = {
  title: 'GATC — Gestor de Análisis para Tendidos y Costos',
  description:
    'Aplicación web CAD moderna para el diseño de instalaciones eléctricas residenciales, cálculo de BOM y documentación en PDF.',
  icons: {
    icon: '/favicon.ico'
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
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen">
        <EngineInitializer />
        {children}
      </body>
    </html>
  );
}
