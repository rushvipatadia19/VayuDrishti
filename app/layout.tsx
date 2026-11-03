import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { Navigation } from '@/components/ui/Navigation';
import { VayuAssistant } from '@/components/chat/VayuAssistant';

export const metadata: Metadata = {
  title: 'VayuDrishti (वायुदृष्टि) · Environmental Intelligence & Statutory Compliance',
  description:
    'National air quality incident reporting, explainable CPCB NAAQS regulatory compliance, and corrective action management platform across India.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#f7f8f5] text-stone-900 font-sans antialiased selection:bg-emerald-200">
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
              {children}
            </main>
            <footer className="border-t border-stone-200 bg-stone-100 py-6 text-center text-xs text-stone-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div>
                  VayuDrishti (वायुदृष्टि) · Environmental Incident Response & Decision Support System
                </div>
                <div>
                  CPCB NAAQS 2009 Standards · OpenStreetMap · Press Information Bureau
                </div>
              </div>
            </footer>
            {/* Global Context-Aware Assistant */}
            <VayuAssistant />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
