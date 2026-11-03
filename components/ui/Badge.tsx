import React from 'react';

const colorMap = {
  green: 'bg-tint text-dark-accent border border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  orange: 'bg-orange-100 text-orange-800 border border-orange-200',
  red: 'bg-red-100 text-red-800 border border-red-200',
  maroon: 'bg-red-200 text-red-950 border border-red-300',
  grey: 'bg-gray-100 text-gray-700 border border-gray-200',
} as const;

export function Badge({
  label,
  color = 'grey',
  className = '',
}: {
  label: string;
  color?: keyof typeof colorMap;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorMap[color]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

