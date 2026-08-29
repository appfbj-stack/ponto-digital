import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Kairos Ponto - Painel Administrativo',
  description: 'SaaS de ponto eletrônico com reconhecimento facial e geolocalização.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:pl-64">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
