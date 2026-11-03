'use client';
import { useApi } from '@/lib/useApi';
import type { Incident } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

function getStatusBadge(status: string): { label: string; color: 'grey' | 'yellow' | 'green' | 'maroon' } {
  switch (status) {
    case 'open':
      return { label: 'Open', color: 'grey' };
    case 'under_review':
      return { label: 'Under review', color: 'yellow' };
    case 'action_taken':
      return { label: 'Action taken', color: 'green' };
    case 'closed':
      return { label: 'Closed', color: 'green' };
    default:
      return { label: status, color: 'grey' };
  }
}

export default function CasesListPage() {
  const { data: incidents, loading, error, refetch } = useApi<Incident[]>('/api/incidents');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Incident Records & Cases
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Official environmental compliance cases submitted across monitored CPCB station nodes.
          </p>
        </div>

        <Link
          href="/report"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition"
        >
          + File New Incident
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {!loading && !error && (!incidents || incidents.length === 0) && (
        <EmptyState
          title="No cases yet"
          body="Report the first air-quality concern to start tracking atmospheric compliance."
        />
      )}

      {!loading && !error && incidents && incidents.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {incidents.map((inc) => {
            const { label, color } = getStatusBadge(inc.status);
            return (
              <Link
                key={inc.id}
                href={`/cases/${inc.id}`}
                className="group block transition focus-visible:outline-none"
              >
                <Card className="p-4 hover:border-gray-400 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={label} color={color} />
                      <span className="text-xs font-mono font-bold text-gray-500 uppercase">
                        {inc.locationName}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-mono">
                        {formatDate(inc.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition">
                      {inc.title}
                    </h3>

                    {inc.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 max-w-2xl">
                        {inc.description}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-gray-100 font-semibold text-gray-800">
                      {inc.pollutant}: {inc.reportedValue ? `${inc.reportedValue} µg/m³` : 'Unmetered'}
                    </span>
                    <span className="text-primary font-semibold text-xs mt-1 group-hover:translate-x-1 transition-transform">
                      View details →
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

