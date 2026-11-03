import React from 'react';
import { AQI_BANDS } from '@/lib/aqi';

const DOT_COLORS: Record<string, string> = {
  Good: 'bg-[#1a7a1a]',
  Satisfactory: 'bg-[#4caf50]',
  Moderate: 'bg-[#f59e0b]',
  Poor: 'bg-[#f97316]',
  'Very Poor': 'bg-[#ef4444]',
  Severe: 'bg-[#7b0000]',
};

export function AqiLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-border text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium">
        {AQI_BANDS.map((band) => (
          <div key={band.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLORS[band.label] || 'bg-gray-400'}`} />
            <span className="text-gray-700">
              {band.label} (≤{band.max})
            </span>
          </div>
        ))}
      </div>
      <span className="text-gray-400 text-[11px]">
        City-level nodes · CPCB AQI Standardized
      </span>
    </div>
  );
}
