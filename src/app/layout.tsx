import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sibbë / Obras — Presupuestos APU para construcción BO',
  description: 'Software de presupuestos de obra con APU, validación normativa CBH-87/NB y export SICOES en un click. Localizado para Bolivia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
