import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BF Mining - Mineral Demand Forecasting',
  description: 'AI-Driven Mineral Demand Forecasting System',
};

/**
 * Root layout wrapping the entire application with global providers.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
