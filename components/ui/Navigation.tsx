'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export function Navigation() {
  const { user, role, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-emerald-950 bg-[#0f2e22] text-stone-100 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-lg bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center font-serif font-bold text-emerald-200 text-lg shadow-inner group-hover:bg-emerald-700 transition">
              व
            </span>
            <div className="flex flex-col">
              <span className="font-serif font-bold tracking-tight text-lg text-emerald-50 leading-none">
                VayuDrishti <span className="font-normal text-xs text-emerald-300 font-sans">वायुदृष्टि</span>
              </span>
              <span className="text-[10px] tracking-wider text-emerald-400/80 uppercase font-mono mt-0.5">
                Environmental Intelligence & Compliance
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-stone-200 hover:text-emerald-300 font-medium transition-colors"
          >
            National Observatory
          </Link>
          <Link
            href="/cases"
            className="text-stone-200 hover:text-emerald-300 font-medium transition-colors"
          >
            Cases & Audits
          </Link>
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-sm"
          >
            <span>+</span> Report Incident
          </Link>

          {/* User / Demo Role Badge & Login / Logout Links */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-emerald-900/60">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-xs shadow-inner hover:border-emerald-500 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-100 font-semibold tracking-wide">
                {role === 'officer' ? 'Officer — Demo Mode' : 'Resident View'}
              </span>
              {user && (
                <span className="text-[10px] text-emerald-300 font-mono">
                  ({user.email.split('@')[0]})
                </span>
              )}
            </Link>

            {user ? (
              <button
                type="button"
                onClick={signOut}
                className="text-xs text-stone-300 hover:text-white underline ml-1"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs text-emerald-300 hover:text-white underline ml-1"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-stone-200 p-2 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d271d] border-t border-emerald-900 px-4 py-4 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-stone-200 hover:text-emerald-300 py-1"
          >
            National Observatory
          </Link>
          <Link
            href="/cases"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-stone-200 hover:text-emerald-300 py-1"
          >
            Cases & Audits
          </Link>
          <Link
            href="/report"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-emerald-300 font-semibold py-1"
          >
            + Report Incident
          </Link>
          <div className="pt-2 border-t border-emerald-900 flex justify-between items-center text-xs">
            <span className="text-emerald-200">
              Role: <strong>{role === 'officer' ? 'Officer — Demo Mode' : 'Resident'}</strong>
            </span>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-emerald-300 underline"
            >
              {user ? 'Settings / Sign out' : 'Sign In'}
            </Link>
          </div>
        </div>
      )}

      {/* Historical Data Provenance Banner */}
      <div className="bg-[#0a2017] border-t border-emerald-950/80 px-4 py-1 text-center text-[11px] text-emerald-300/90 font-medium">
        Ambient Air Quality Monitoring Baseline: <span className="font-semibold text-emerald-200">2015–2020 Historical Records</span> (Not live real-time sensor streams). Statutory checks against CPCB NAAQS 2009.
      </div>
    </header>
  );
}
