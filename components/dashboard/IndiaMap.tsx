'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StationSummary } from '@/lib/types';
import { NewsItem } from '@/app/api/news/route';
import { getBand, AqiBucket } from '@/lib/aqi';

const BAND_COLORS: Record<AqiBucket, string> = {
  Good: '#10b981',
  Satisfactory: '#84cc16',
  Moderate: '#eab308',
  Poor: '#f97316',
  'Very Poor': '#ef4444',
  Severe: '#7f1d1d',
};

interface IndiaMapProps {
  stations: StationSummary[];
  selectedStationId?: string | null;
  onSelectStation: (stationId: string) => void;
  newsItems?: NewsItem[];
}

export function IndiaMap({
  stations,
  selectedStationId,
  onSelectStation,
  newsItems = [],
}: IndiaMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const newsLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [showStations, setShowStations] = useState(true);
  const [showNews, setShowNews] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapReady, setMapReady] = useState(false);

  // Dynamically load Leaflet on the client only
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      leafletRef.current = L;

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [22.5, 78.9],
        zoom: 5,
        minZoom: 4,
        maxZoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | VayuDrishti',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      newsLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);

      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Stations Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const L = leafletRef.current;
    if (!map || !markersLayer || !L || !mapReady) return;

    markersLayer.clearLayers();
    if (!showStations) return;

    stations.forEach((stn) => {
      const isSelected = stn.id === selectedStationId;
      const band = getBand(stn.aqi ?? 0);
      const bandColor = BAND_COLORS[band.label] || '#10b981';

      const marker = L.circleMarker([stn.lat, stn.lng], {
        radius: isSelected ? 12 : 8,
        fillColor: bandColor,
        color: isSelected ? '#1c1917' : '#ffffff',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: 0.88,
      });

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 180px;">
          <div style="font-weight: 700; font-size: 14px; color: #1c1917; margin-bottom: 2px;">
            ${stn.name}
          </div>
          <div style="color: #78716c; font-size: 11px; margin-bottom: 6px;">
            ${stn.city}, ${stn.state}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="background-color: ${bandColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">
              AQI ${stn.aqi ?? 'N/A'}
            </span>
            <span style="color: #44403c; font-weight: 600;">
              ${stn.aqiBucket ?? 'Unknown'}
            </span>
          </div>
          <div style="font-size: 11px; color: #57534e; border-top: 1px solid #e7e5e4; padding-top: 4px;">
            <div>PM2.5: <b>${stn.latestPm25 ?? 'N/A'} µg/m³</b></div>
            <div>PM10: <b>${stn.latestPm10 ?? 'N/A'} µg/m³</b></div>
            <div style="color: #a8a29e; font-size: 10px; margin-top: 4px;">
              Measured: ${new Date(stn.measuredAt).toLocaleDateString('en-IN')} (Historical baseline)
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        onSelectStation(stn.id);
      });

      markersLayer.addLayer(marker);
    });
  }, [stations, selectedStationId, showStations, onSelectStation, mapReady]);

  // Update News Markers
  useEffect(() => {
    const newsLayer = newsLayerRef.current;
    const L = leafletRef.current;
    if (!newsLayer || !L || !mapReady) return;

    newsLayer.clearLayers();
    if (!showNews) return;

    newsItems
      .filter((item) => item.lat !== null && item.lng !== null)
      .forEach((item) => {
        const newsMarker = L.circleMarker([item.lat!, item.lng!], {
          radius: 7,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const newsPopupHtml = `
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 220px;">
            <span style="background-color: #0284c7; color: white; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
              Govt Notification
            </span>
            <div style="font-weight: 700; color: #0c4a6e; margin-top: 5px; font-size: 12px;">
              ${item.title}
            </div>
            <div style="color: #64748b; font-size: 10px; margin-top: 3px;">
              ${item.source} · ${new Date(item.publishedAt).toLocaleDateString('en-IN')}
            </div>
            <div style="font-size: 10px; color: #475569; margin-top: 5px; font-style: italic;">
              ${item.isInferredLocation ? '📍 Approximate location inferred from announcement text' : ''}
            </div>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 6px; color: #0369a1; font-weight: 600; text-decoration: underline; font-size: 11px;">
              Read Official PIB Release &rarr;
            </a>
          </div>
        `;

        newsMarker.bindPopup(newsPopupHtml);
        newsLayer.addLayer(newsMarker);
      });
  }, [newsItems, showNews, mapReady]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-stone-200 bg-[#f4f6f3] shadow-sm">
      {/* Controls Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-wrap gap-2 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-stone-200 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-700">
          <input
            type="checkbox"
            checked={showStations}
            onChange={(e) => setShowStations(e.target.checked)}
            className="rounded text-emerald-700 focus:ring-emerald-600"
          />
          Monitoring Stations ({stations.length})
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-sky-800">
          <input
            type="checkbox"
            checked={showNews}
            onChange={(e) => setShowNews(e.target.checked)}
            className="rounded text-sky-700 focus:ring-sky-600"
          />
          PIB Govt News
        </label>
        <div className="h-4 w-[1px] bg-stone-300 mx-1 self-center" />
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          className="text-stone-600 hover:text-stone-900 font-semibold underline"
        >
          {viewMode === 'map' ? 'View as List' : 'View as Map'}
        </button>
      </div>

      {/* Map View */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${viewMode === 'map' ? 'block' : 'hidden'}`}
      />

      {/* List Alternative View */}
      {viewMode === 'list' && (
        <div className="w-full h-full overflow-y-auto p-4 bg-white">
          <div className="text-sm font-semibold text-stone-800 mb-3">
            National Monitoring Stations Directory
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stations.map((stn) => {
              const band = getBand(stn.aqi ?? 0);
              const bandColor = BAND_COLORS[band.label] || '#10b981';
              return (
                <div
                  key={stn.id}
                  onClick={() => {
                    onSelectStation(stn.id);
                    setViewMode('map');
                  }}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                    stn.id === selectedStationId
                      ? 'border-emerald-700 bg-emerald-50/50'
                      : 'border-stone-200 hover:border-stone-400 bg-stone-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-stone-900 text-xs">{stn.name}</div>
                      <div className="text-[11px] text-stone-500">{stn.state}</div>
                    </div>
                    <span
                      style={{ backgroundColor: bandColor }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                    >
                      AQI {stn.aqi ?? 'N/A'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-stone-600">
                    PM2.5: <b>{stn.latestPm25 ?? 'N/A'} µg/m³</b> · PM10: <b>{stn.latestPm10 ?? 'N/A'}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-stone-200 text-[11px] text-stone-700 hidden sm:flex items-center gap-3">
        <span className="font-semibold text-stone-800">AQI Bands:</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Good (0-50)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" /> Satisfactory (51-100)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Moderate (101-200)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /> Poor (201-300)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Very Poor (301-400)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7f1d1d]" /> Severe (401+)
        </span>
        <span className="flex items-center gap-1 border-l border-stone-300 pl-2 text-sky-800">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" /> PIB News
        </span>
      </div>
    </div>
  );
}
