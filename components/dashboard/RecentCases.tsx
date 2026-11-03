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

export function RecentCases() {
  const { data: incidents, loading, error, refetch } = useApi<Incident[]>('/api/incidents');

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={refetch} />;
  }

  if (!incidents || incidents.length === 0) {
    return (
      <EmptyState
        title="No cases yet"
        body="Be the first to report an air-quality concern in your locality."
      />
    );
  }

  const latestThree = incidents.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Recent cases</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {incidents.length} Registered
          </span>
        </div>
        <Link
          href="/cases"
          className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition"
        >
          <span>View all cases</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestThree.map((inc) => {
          const { label, color } = getStatusBadge(inc.status);
          return (
            <Link
              key={inc.id}
              href={`/cases/${inc.id}`}
              className="group block transition focus-visible:outline-none"
            >
              <Card className="h-full flex flex-col justify-between p-5 hover:border-gray-400 hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {inc.locationName}
                    </span>
                    <Badge label={label} color={color} />
                  </div>

                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition">
                    {inc.title}
                  </h3>

                  {inc.description && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                      {inc.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono font-medium text-gray-700">
                    {inc.pollutant}: {inc.reportedValue ? `${inc.reportedValue} µg/m³` : 'Unmetered'}
                  </span>
                  <span>{formatDate(inc.createdAt)}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

