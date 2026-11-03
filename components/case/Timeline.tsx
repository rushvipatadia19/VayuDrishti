import React from 'react';
import type { CaseEvent } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/format';

const KIND_META: Record<string, { icon: string; label: string; badgeBg: string }> = {
  report: { icon: '📝', label: 'Report Filed', badgeBg: 'bg-blue-100 text-blue-800' },
  analysis: { icon: '⚡', label: 'Screening Analysis', badgeBg: 'bg-green-100 text-green-800' },
  action: { icon: '🛠️', label: 'Action Logged', badgeBg: 'bg-amber-100 text-amber-800' },
  status_change: { icon: '🔄', label: 'Status Transition', badgeBg: 'bg-purple-100 text-purple-800' },
};

export function Timeline({ events }: { events: CaseEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p className="text-sm">No activity recorded yet for this case.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-base font-bold text-gray-900 border-b border-border pb-3">
        Case Audit Trail & Activity Timeline
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {events.map((ev) => {
          const meta = KIND_META[ev.kind] || {
            icon: '📌',
            label: ev.kind,
            badgeBg: 'bg-gray-100 text-gray-700',
          };

          return (
            <div key={ev.id} className="relative group">
              {/* Timeline marker */}
              <span className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface border border-gray-300 text-xs shadow-xs">
                {meta.icon}
              </span>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeBg}`}
                  >
                    {meta.label}
                  </span>

                  {ev.fromStatus && ev.toStatus && (
                    <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {ev.fromStatus} → {ev.toStatus}
                    </span>
                  )}

                  <span className="text-xs text-gray-400 font-mono">
                    {formatDate(ev.createdAt)}
                  </span>
                </div>

                <p className="text-sm text-gray-800 leading-relaxed pt-0.5">
                  {ev.text}
                </p>

                {ev.imageUrl && (
                  <div className="pt-2">
                    <a href={ev.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={ev.imageUrl}
                        alt="Event evidence"
                        className="h-24 w-24 rounded-lg object-cover border border-border hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
