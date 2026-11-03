import React from 'react';
import type { Analysis } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export function InfoCards({
  analysis,
  loading,
}: {
  analysis: Analysis | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          'Current AQI',
          'Observed vs Limit',
          'Statistical Anomaly',
          'Data Quality',
        ].map((title) => (
          <Card key={title} className="p-4 flex flex-col justify-between bg-gray-50 border-dashed">
            <span className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wide">
              {title}
            </span>
            <div className="py-4 text-center">
              <span className="text-xs font-medium text-gray-500">
                Run the analysis to see evidence
              </span>
            </div>
            <span className="text-[11px] text-gray-400">—</span>
          </Card>
        ))}
      </div>
    );
  }

  // Card 1: Current AQI
  const aqiBucket = analysis.aqiBucket ?? 'Moderate';
  let aqiColor: 'green' | 'yellow' | 'orange' | 'red' | 'maroon' = 'yellow';
  if (aqiBucket === 'Good' || aqiBucket === 'Satisfactory') aqiColor = 'green';
  if (aqiBucket === 'Poor') aqiColor = 'orange';
  if (aqiBucket === 'Very Poor') aqiColor = 'red';
  if (aqiBucket === 'Severe') aqiColor = 'maroon';

  // Card 2: Limit Check
  const { observed, limit, ratio, exceeded, standard, averagingPeriod } = analysis.threshold;

  // Card 3: Anomaly / z-score
  const isAnomaly = analysis.isAnomaly;
  const z = analysis.zScore;

  // Card 4: Quality
  const quality = analysis.dataQuality;
  const qualityColor: 'green' | 'yellow' | 'red' | 'grey' =
    quality === 'valid' ? 'green' : quality === 'stale' ? 'yellow' : 'red';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. AQI */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500">
            Compliance Index
          </span>
          <Badge label={aqiBucket} color={aqiColor} />
        </div>
        <div className="my-2">
          <span className="text-3xl font-extrabold font-mono text-gray-900">
            {analysis.currentAqi ?? '—'}
          </span>
        </div>
        {/* Segmented scale visual indicator */}
        <div className="space-y-1">
          <div className="grid grid-cols-6 gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-gray-200">
            <div className="bg-[#1a7a1a]" />
            <div className="bg-[#4caf50]" />
            <div className="bg-[#f59e0b]" />
            <div className="bg-[#f97316]" />
            <div className="bg-[#ef4444]" />
            <div className="bg-[#7b0000]" />
          </div>
          <span className="text-[11px] text-gray-500 block">Band: {aqiBucket}</span>
        </div>
      </Card>

      {/* 2. Observed vs Limit */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500">
            Observed vs Limit
          </span>
          <Badge
            label={exceeded ? 'Exceeds limit' : 'Within limit'}
            color={exceeded ? 'red' : 'green'}
          />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-gray-900">
            {ratio}× <span className="text-xs text-gray-500 font-sans font-normal">the daily limit</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-600 space-y-0.5">
          <p className="font-mono">
            {observed} µg/m³ vs {limit} µg/m³
          </p>
          <p className="text-gray-400 text-[10px]">
            {standard} ({averagingPeriod})
          </p>
        </div>
      </Card>

      {/* 3. Statistical Anomaly */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500">
            Anomaly Status
          </span>
          <Badge
            label={isAnomaly ? 'Unusual' : 'Normal range'}
            color={isAnomaly ? 'red' : 'green'}
          />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-gray-900">
            z: {z > 0 ? `+${z}` : z}
          </div>
        </div>
        <span className="text-[11px] text-gray-600 block">
          {isAnomaly ? 'Statistically elevated for this station' : 'Within typical seasonal variation'}
        </span>
      </Card>

      {/* 4. Data Quality */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-500">
            Data Quality
          </span>
          <Badge label={quality.toUpperCase()} color={qualityColor} />
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-mono text-gray-900 capitalize">
            {quality}
          </div>
        </div>
        <span className="text-[11px] text-gray-600 block">
          {quality === 'valid'
            ? 'Continuous CPCB telemetry valid'
            : quality === 'stale'
            ? 'Sensor telemetry older than 48h'
            : 'Readings outside normal sensor scale'}
        </span>
      </Card>
    </div>
  );
}

