import React from 'react';
import type { CaseStatus } from '@/lib/types';

const STEPS: { key: CaseStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under review' },
  { key: 'action_taken', label: 'Action taken' },
  { key: 'closed', label: 'Closed' },
];

export function StatusStepper({ currentStatus }: { currentStatus: CaseStatus }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {STEPS.map((step, idx) => {
        const isCurrent = step.key === currentStatus;
        const isPast = idx < currentIndex;

        let badgeStyle = 'bg-gray-100 text-gray-400 border-gray-200';
        if (isCurrent) {
          badgeStyle = 'bg-primary text-white border-primary shadow-sm font-bold';
        } else if (isPast) {
          badgeStyle = 'bg-tint text-dark-accent border-green-300 font-semibold';
        }

        return (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition ${badgeStyle}`}
            >
              <span className="font-mono text-[11px]">{idx + 1}.</span>
              <span>{step.label}</span>
              {isPast && <span className="text-[10px]">✓</span>}
            </div>

            {idx < STEPS.length - 1 && (
              <span className={`text-xs ${idx < currentIndex ? 'text-green-600' : 'text-gray-300'}`}>
                ›
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

