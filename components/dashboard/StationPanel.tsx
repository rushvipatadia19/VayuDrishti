'use client';
import type { StationSummary } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MiniReadingsChart } from './MiniReadingsChart';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

const aqiBadgeColor: Record<string, 'green' | 'yellow' | 'orange' | 'red' | 'maroon'> = {
  Good: 'green',
  Satisfactory: 'green',
  Moderate: 'yellow',
  Poor: 'orange',
  'Very Poor': 'red',
  Severe: 'maroon',
};

export function StationPanel({
  station,
  onClose,
}: {
  station: StationSummary | null;
  onClose?: () => void;
}) {
  if (!station) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <span className="text-3xl mb-2">📍</span>
        <h3 className="font-semibold text-gray-700">Select a Station</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          Click any city pin on the India map to inspect telemetry, AQI trends, and compliance metrics.
        </p>
      </Card>
    );
  }

  const badgeColor = station.aqiBucket ? aqiBadgeColor[station.aqiBucket] || 'yellow' : 'yellow';

  return (
    <Card className="h-full flex flex-col justify-between p-6">
      <div className="space-y-5">
        {/* Header & Location */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {station.city}, {station.state}
              </h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="md:hidden text-gray-400 hover:text-gray-600 text-lg leading-none"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Node ID: {station.id} · CPCB Continuous Monitoring
            </p>
          </div>
        </div>

        {/* Big AQI Banner */}
        <div className="rounded-xl bg-gray-50 p-4 border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-500">
              National Air Quality Index
            </span>
            <div className="text-3xl font-extrabold font-mono text-gray-900 mt-0.5">
              {station.aqi ?? '—'}
            </div>
          </div>
          <Badge label={station.aqiBucket ?? 'Calculating'} color={badgeColor} className="text-sm px-3 py-1" />
        </div>

        {/* Dual Pollutant Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-3 border border-border">
            <span className="text-[11px] font-mono font-semibold text-gray-500 block uppercase">
              PM2.5 Level
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-gray-900">
                {station.latestPm25 ?? '—'}
              </span>
              <span className="text-xs font-mono text-gray-500 ml-1">µg/m³</span>
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">Limit: 60 µg/m³</span>
          </div>

          <div className="rounded-xl bg-gray-50 p-3 border border-border">
            <span className="text-[11px] font-mono font-semibold text-gray-500 block uppercase">
              PM10 Level
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold font-mono text-gray-900">
                {station.latestPm10 ?? '—'}
              </span>
              <span className="text-xs font-mono text-gray-500 ml-1">µg/m³</span>
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">Limit: 100 µg/m³</span>
          </div>
        </div>

        {/* Measurement timestamp */}
        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 font-mono">
          <span>🕒 Measured:</span>
          <span>{formatDate(station.measuredAt)}</span>
        </div>

        {/* 30-Day Line Chart */}
        <MiniReadingsChart stationId={station.id} pollutant="PM2.5" />
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-2 border-t border-border">
        <Link href={`/report?stationId=${station.id}`} className="block w-full">
          <Button variant="primary" className="w-full py-2.5 font-semibold text-sm">
            Report an incident here
          </Button>
        </Link>
      </div>
    </Card>
  );
}
