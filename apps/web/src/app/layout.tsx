import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Axios Pay – African Cross-Border Payments',
  description:
    'Fast, affordable currency swaps across African currencies: NGN, KES, UGX, GHS, ZAR.',
  keywords: ['Africa', 'cross-border payments', 'currency swap', 'fintech', 'NGN', 'KES'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
