import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Angebots-Tool',
  description: 'Angebote einfach und schnell erstellen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/auftraege" className="text-blue-600 font-bold text-lg">
              ⚒ Angebots-Tool
            </a>
            <a href="/einrichten" className="text-sm text-gray-500 hover:text-gray-700">
              Einstellungen
            </a>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
