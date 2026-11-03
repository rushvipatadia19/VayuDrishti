import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'VayuDrishti · Air-Quality Incident & Compliance',
  description: 'Evidence-first atmospheric monitoring and compliance portal for India',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-gray-900 antialiased flex flex-col">
        {/* Stitch Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl shadow-sm group-hover:bg-primary-hover transition">
                  🌱
                </span>
                <span className="text-xl font-bold tracking-tight text-dark-accent">
                  VayuDrishti
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-dark-accent transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/cases"
                  className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-dark-accent transition"
                >
                  Cases
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Mandatory Historical Data Chip */}
              <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                <span>Historical data (2015–2020), not live</span>
              </div>

              <Link
                href="/report"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Report an incident</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </main>

        {/* Stitch Footer */}
        <footer className="border-t border-border bg-surface py-6 text-sm text-gray-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-primary font-semibold">✓</span>
              <span>VayuDrishti Environmental Compliance & Incident Platform</span>
            </div>
            <div className="text-xs text-gray-400">
              City-level monitoring · CPCB NAAQS Standardized Analysis
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
