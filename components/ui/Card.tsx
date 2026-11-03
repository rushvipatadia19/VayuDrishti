import React from 'react';

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface rounded-card border border-border p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

