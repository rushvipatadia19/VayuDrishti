import React from 'react';

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-500">
      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="font-semibold text-gray-700">{title}</p>
      {body && <p className="text-sm max-w-sm">{body}</p>}
    </div>
  );
}
