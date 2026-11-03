'use client';
import type { Reading } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatDateShort } from '@/lib/format';

export function CaseReadingsChart({
  readings,
  forecast,
  pollutant,
  limit,
  loading,
  error,
  onRetry,
}: {
  readings: Reading[] | null;
  forecast?: { t: string; value: number }[];
  pollutant: 'PM2.5' | 'PM10';
  limit: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!readings || readings.length === 0) return null;

  const pastValues = readings.map((r) => r.value);
  const forecastValues = forecast ? forecast.map((f) => f.value) : [];
  const allValues = [...pastValues, ...forecastValues, limit];

  const maxVal = Math.max(...allValues, 100);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const width = 800;
  const height = 220;
  const paddingY = 20;
  const chartHeight = height - paddingY * 2;

  // Split width: 85% for past 30 days, 15% for 3 forecast days if forecast exists
  const pastWidth = forecast && forecast.length > 0 ? width * 0.85 : width;

  const pastPoints = readings.map((r, i) => {
    const x = (i / (readings.length - 1)) * pastWidth;
    const y = height - paddingY - ((r.value - minVal) / range) * chartHeight;
    return { x, y, value: r.value, t: r.measuredAt };
  });

  const lastPast = pastPoints[pastPoints.length - 1];

  let forecastPoints: { x: number; y: number; value: number; t: string }[] = [];
  if (forecast && forecast.length > 0 && lastPast) {
    forecastPoints = [
      lastPast,
      ...forecast.map((f, i) => {
        const x = pastWidth + ((i + 1) / forecast.length) * (width - pastWidth);
        const y = height - paddingY - ((f.value - minVal) / range) * chartHeight;
        return { x, y, value: f.value, t: f.t };
      }),
    ];
  }

  const pastPathD = `M ${pastPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const pastAreaD = `M ${pastPoints[0].x},${height} L ${pastPoints.map((p) => `${p.x},${p.y}`).join(' L ')} L ${lastPast.x},${height} Z`;

  const forecastPathD =
    forecastPoints.length > 0
      ? `M ${forecastPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`
      : '';

  const limitY = height - paddingY - ((limit - minVal) / range) * chartHeight;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            30-Day Atmospheric Telemetry & Trend Analysis
          </h3>
          <p className="text-xs text-gray-500">
            Comparing daily 24-hour mean concentrations against CPCB statutory limits.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-[#ef4444]" />
            <span className="text-gray-600">Continuous Telemetry</span>
          </div>
          {forecast && forecast.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-primary" />
              <span className="text-gray-600">3-Day Forecast</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-red-700" />
            <span className="text-red-700 font-mono">Limit ({limit} µg/m³)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative rounded-xl bg-gray-50 p-4 border border-border overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-52 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="case-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Limit Reference Line */}
          {limitY >= 0 && limitY <= height && (
            <g>
              <line
                x1="0"
                y1={limitY}
                x2={width}
                y2={limitY}
                stroke="#b91c1c"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text
                x={width - 8}
                y={limitY - 6}
                fill="#b91c1c"
                fontSize="11"
                textAnchor="end"
                fontFamily="monospace"
                fontWeight="700"
              >
                CPCB NAAQS Limit: {limit} µg/m³
              </text>
            </g>
          )}

          {/* Area fill for past readings */}
          <path d={pastAreaD} fill="url(#case-area-grad)" />

          {/* Past line */}
          <path
            d={pastPathD}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast dashed line */}
          {forecastPathD && (
            <path
              d={forecastPathD}
              fill="none"
              stroke="#006027"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Spike dot on highest reading */}
          {lastPast && (
            <g>
              <circle
                cx={lastPast.x}
                cy={lastPast.y}
                r="6"
                fill="#b91c1c"
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={lastPast.x}
                y={lastPast.y - 10}
                fill="#1f2937"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="700"
                textAnchor="middle"
              >
                {lastPast.value} µg/m³
              </text>
            </g>
          )}
        </svg>

        {/* Date Footers */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs font-mono text-gray-500">
          <span>{formatDateShort(readings[0].measuredAt)}</span>
          <span className="font-semibold text-gray-800">
            Spike Observation ({lastPast?.value} µg/m³)
          </span>
          {forecast && forecast.length > 0 && (
            <span className="text-primary font-semibold">
              Forecast Target: {formatDateShort(forecast[forecast.length - 1].t)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
