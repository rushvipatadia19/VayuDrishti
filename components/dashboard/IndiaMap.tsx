'use client';
import { useMemo } from 'react';
import type { StationSummary } from '@/lib/types';
import { AqiLegend } from './AqiLegend';

const AQI_COLORS: Record<string, { fill: string; ring: string }> = {
  Good: { fill: '#1a7a1a', ring: '#dcfce7' },
  Satisfactory: { fill: '#4caf50', ring: '#dcfce7' },
  Moderate: { fill: '#f59e0b', ring: '#fef3c7' },
  Poor: { fill: '#f97316', ring: '#ffedd5' },
  'Very Poor': { fill: '#ef4444', ring: '#fee2e2' },
  Severe: { fill: '#7b0000', ring: '#fecaca' },
};

// India geographic bounding box calibration:
// Lat: ~8.0 to ~37.0 N
// Lng: ~68.0 to ~97.0 E
function projectCoords(lat: number, lng: number, width = 600, height = 660) {
  const minLat = 8.0;
  const maxLat = 36.5;
  const minLng = 68.0;
  const maxLng = 97.0;

  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  // Invert Y axis for canvas coordinates
  const y = height - ((lat - minLat) / (maxLat - minLat)) * height;

  return { x: Math.round(x), y: Math.round(y) };
}

export function IndiaMap({
  stations,
  selectedStation,
  onSelect,
}: {
  stations: StationSummary[];
  selectedStation: StationSummary | null;
  onSelect: (stn: StationSummary) => void;
}) {
  const projectedStations = useMemo(() => {
    return stations.map((s) => ({
      ...s,
      ...projectCoords(s.lat, s.lng),
    }));
  }, [stations]);

  return (
    <div className="flex flex-col space-y-3">
      <div className="relative w-full h-[520px] rounded-xl bg-gray-50 border border-border overflow-hidden flex items-center justify-center p-4">
        {/* Subtle decorative telemetry grid */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#6b7280" strokeWidth="0.5" strokeDasharray="2 4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Scaled SVG Canvas for India Subcontinent */}
        <div className="relative w-full max-w-[560px] h-[480px]">
          <svg viewBox="0 0 600 660" className="w-full h-full overflow-visible">
            {/* India simplified outline silhouette */}
            <path
              d="M 270,30 L 320,35 L 340,70 L 360,90 L 320,120 L 325,150 L 370,165 L 410,170 L 450,195 L 510,200 L 570,190 L 590,215 L 560,240 L 510,235 L 460,260 L 430,290 L 400,310 L 380,370 L 370,440 L 350,490 L 320,560 L 290,630 L 275,650 L 270,630 L 240,560 L 210,490 L 190,430 L 175,370 L 160,340 L 120,310 L 100,290 L 125,260 L 160,260 L 190,240 L 210,180 L 230,150 L 240,90 Z"
              fill="#e5e7eb"
              stroke="#d1d5db"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Crown */}
            <path d="M 240,90 L 260,30 L 300,35 L 310,65 L 290,95 Z" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />
            {/* Eastern Horn */}
            <path d="M 460,220 L 560,210 L 590,230 L 550,250 L 490,240 Z" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1" />

            {/* Station Pins */}
            {projectedStations.map((stn) => {
              const isSelected = selectedStation?.id === stn.id;
              const colorInfo = stn.aqiBucket ? AQI_COLORS[stn.aqiBucket] || AQI_COLORS.Moderate : AQI_COLORS.Moderate;

              return (
                <g
                  key={stn.id}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => onSelect(stn)}
                >
                  {/* Selected Ripple Ring */}
                  {isSelected && (
                    <circle
                      cx={stn.x}
                      cy={stn.y}
                      r="16"
                      fill={colorInfo.fill}
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer circle */}
                  <circle
                    cx={stn.x}
                    cy={stn.y}
                    r={isSelected ? '9' : '6.5'}
                    fill={colorInfo.fill}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="drop-shadow-md hover:scale-125 transition-transform"
                  />

                  {/* Tooltip Label for Selected Node */}
                  {isSelected && (
                    <g transform={`translate(${stn.x + 12}, ${stn.y - 12})`}>
                      <rect
                        x="0"
                        y="0"
                        width="110"
                        height="30"
                        rx="6"
                        fill="#1f2937"
                        className="shadow-xl"
                      />
                      <circle cx="10" cy="15" r="4" fill={colorInfo.fill} />
                      <text
                        x="20"
                        y="19"
                        fill="#ffffff"
                        fontSize="12"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        {stn.city} · {stn.aqi ?? '—'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* OpenStreetMap Notice bottom overlay */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-gray-500 pointer-events-none">
          <span className="bg-white/80 px-2 py-0.5 rounded shadow-xs">
            {projectedStations.length} CPCB Monitored Cities
          </span>
          <span className="bg-white/80 px-2 py-0.5 rounded shadow-xs">
            City coordinates © OpenStreetMap contributors
          </span>
        </div>
      </div>

      <AqiLegend />
    </div>
  );
}
