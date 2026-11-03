'use client';
import { useApi } from '@/lib/useApi';
import type { Reading } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort } from '@/lib/format';

export function MiniReadingsChart({
  stationId,
  pollutant = 'PM2.5',
}: {
  stationId: string;
  pollutant?: 'PM2.5' | 'PM10';
}) {
  const { data: readings, loading, error, refetch } = useApi<Reading[]>(
    `/api/stations/${stationId}/readings?pollutant=${pollutant}&days=30`
  );

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!readings || readings.length === 0) {
    return <EmptyState title="No readings available" />;
  }

  const values = readings.map((r) => r.value);
  const maxVal = Math.max(...values, 120);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  // Build SVG path
  const width = 360;
  const height = 90;
  const paddingY = 10;
  const chartHeight = height - paddingY * 2;

  const points = readings.map((r, i) => {
    const x = (i / (readings.length - 1)) * width;
    const y = height - paddingY - ((r.value - minVal) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  // Standard limit line (60 for PM2.5, 100 for PM10)
  const limit = pollutant === 'PM2.5' ? 60 : 100;
  const limitY = height - paddingY - ((limit - minVal) / range) * chartHeight;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold uppercase tracking-wider">30-Day Trajectory ({pollutant})</span>
        <span className="text-red-700 font-mono font-medium flex items-center gap-1">
          <span className="inline-block w-2.5 h-0.5 bg-red-600" />
          NAAQS Limit ({limit} µg/m³)
        </span>
      </div>

      <div className="relative rounded-xl bg-gray-50 p-2 border border-border overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Limit line */}
          {limitY >= 0 && limitY <= height && (
            <line
              x1="0"
              y1={limitY}
              x2={width}
              y2={limitY}
              stroke="#b91c1c"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          )}

          {/* Area under curve */}
          <path d={areaD} fill="url(#chart-grad)" />

          {/* Line curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Spike dot on latest value */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="4"
              fill="#b91c1c"
              stroke="#fff"
              strokeWidth="2"
            />
          )}
        </svg>

        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-gray-400">
          <span>{formatDateShort(readings[0].measuredAt)}</span>
          <span className="font-semibold text-gray-700">
            {formatDateShort(readings[readings.length - 1].measuredAt)} ({readings[readings.length - 1].value} µg/m³)
          </span>
        </div>
      </div>
    </div>
  );
}
