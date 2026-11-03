'use client';
import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import type { StationSummary } from '@/lib/types';
import { IndiaMap } from '@/components/dashboard/IndiaMap';
import { StationPanel } from '@/components/dashboard/StationPanel';
import { RecentCases } from '@/components/dashboard/RecentCases';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

export function DashboardView() {
  const { data: stations, loading, error, refetch } = useApi<StationSummary[]>('/api/stations');
  const [selectedStation, setSelectedStation] = useState<StationSummary | null>(null);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-1 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500">
              National Air Quality Telemetry & Compliance Ledger
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            See the air. Explain the risk. Close the case.
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Continuous CPCB continuous monitoring stations · Regulatory exceedance detection.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition"
          >
            <span>+ Report an incident</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Map (Left) & Station Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          {loading && <Skeleton className="h-[520px] w-full rounded-xl" />}
          {error && <ErrorBanner message={error} onRetry={refetch} />}
          {!loading && !error && (!stations || stations.length === 0) && (
            <EmptyState title="No stations found" body="Unable to load station telemetry data." />
          )}
          {!loading && !error && stations && stations.length > 0 && (
            <IndiaMap
              stations={stations}
              selectedStation={selectedStation ?? stations[0]}
              onSelect={(stn) => setSelectedStation(stn)}
            />
          )}
        </div>

        <div className="lg:col-span-4 h-full">
          <StationPanel
            station={selectedStation ?? (stations && stations.length > 0 ? stations[0] : null)}
            onClose={() => setSelectedStation(null)}
          />
        </div>
      </div>

      {/* Bottom Section: Recent Cases */}
      <div className="pt-4 border-t border-border">
        <RecentCases />
      </div>
    </div>
  );
}
