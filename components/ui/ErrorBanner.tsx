import React from 'react';

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
    >
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold underline hover:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}

