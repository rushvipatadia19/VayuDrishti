import React from 'react';
import type { Incident, CaseStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { StatusStepper } from './StatusStepper';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

function getStatusBadge(status: CaseStatus): { label: string; color: 'grey' | 'yellow' | 'green' | 'maroon' } {
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

export function CaseHeader({ incident }: { incident: Incident }) {
  const { label, color } = getStatusBadge(incident.status);

  return (
    <div className="space-y-4 pb-6 border-b border-border">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link href="/" className="hover:text-dark-accent underline">
          ← Back to map
        </Link>
        <span>/</span>
        <span className="font-mono uppercase">{incident.id}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={label} color={color} className="text-xs px-2.5 py-0.5" />
            <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {incident.pollutant} Concern
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500 font-medium">
              Reported on {formatDate(incident.createdAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {incident.title}
          </h1>

          <p className="text-sm font-medium text-gray-600">
            📍 {incident.locationName}
          </p>

          {incident.description && (
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-border">
              {incident.description}
            </p>
          )}
        </div>

        {incident.imageUrl && (
          <div className="shrink-0">
            <a href={incident.imageUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={incident.imageUrl}
                alt="Case Evidence"
                className="h-28 w-28 rounded-xl object-cover border border-border shadow-sm hover:opacity-90 transition"
              />
            </a>
            <span className="block text-[11px] text-gray-400 text-center mt-1">Evidence photo</span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="pt-2">
        <StatusStepper currentStatus={incident.status} />
      </div>
    </div>
  );
}

