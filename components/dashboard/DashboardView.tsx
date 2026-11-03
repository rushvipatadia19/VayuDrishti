'use client';

import React, { useState, useEffect } from 'react';
import { StationSummary } from '@/lib/types';
import { IndiaMap } from './IndiaMap';
import { StationPanel } from './StationPanel';
import { RecentCases } from './RecentCases';
import { NewsItem } from '@/app/api/news/route';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export function DashboardView() {
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  // Government News State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    fetch('/api/stations')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setStations(json.data);
          if (json.data.length > 0) {
            setSelectedStationId(json.data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));

    fetchNews();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNews();
      }
    }, 1000 * 60 * 15);

    return () => clearInterval(interval);
  }, []);

  async function fetchNews(refresh = false) {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news${refresh ? '?refresh=true' : ''}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNews(json.data);
        setLastChecked(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // fallback
    } finally {
      setNewsLoading(false);
    }
  }

  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  return (
    <div className="space-y-6">
      {/* Hero Observatory Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold mb-2">
            <span>●</span> National Air Quality Observatory
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">
            See the air. Explain the risk. Close the case.
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl">
            Continuous screening of particulate pollutants against CPCB NAAQS statutory thresholds,
            anomaly detection, and verified case-management workflows across 26 major Indian urban centres.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/report"
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            + File Incident Report
          </Link>
          <Link
            href="/cases"
            className="px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-semibold rounded-lg transition"
          >
            View Active Cases
          </Link>
        </div>
      </div>

      {/* Main Grid: Interactive Geographic Map & Station Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Real Leaflet Map */}
        <div className="lg:col-span-8">
          {loading ? (
            <Skeleton className="w-full h-[540px] rounded-xl" />
          ) : (
            <IndiaMap
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStation={(id) => setSelectedStationId(id)}
              newsItems={news}
            />
          )}
        </div>

        {/* Selected Station Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {selectedStation ? (
            <StationPanel station={selectedStation} />
          ) : (
            <Card className="p-6 text-center text-sm text-stone-500">
              Select any station on the map to inspect ambient baseline readings.
            </Card>
          )}
        </div>
      </div>

      {/* Two Column Section: Government News Bulletin & Recent Cases Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Official PIB Government Environmental Announcements */}
        <div className="lg:col-span-5">
          <Card className="p-5 bg-white border-stone-200 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                  <h3 className="font-serif font-bold text-stone-900 text-sm">
                    Official Government Environmental Bulletins
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => fetchNews(true)}
                  disabled={newsLoading}
                  className="text-xs text-sky-700 hover:text-sky-900 font-medium underline flex items-center gap-1"
                >
                  {newsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <p className="text-[11px] text-stone-500 mb-4">
                Verified announcements from Press Information Bureau (MoEFCC, CPCB, CAQM).
                {lastChecked && ` Last checked: ${lastChecked}`}
              </p>

              <div className="space-y-3">
                {news.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 hover:border-sky-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                      <span className="font-medium text-sky-800">{item.source}</span>
                      <span>{new Date(item.publishedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-xs text-stone-900 hover:text-sky-800 line-clamp-2"
                    >
                      {item.title}
                    </a>
                    {item.locationName && (
                      <div className="mt-1 text-[10px] text-sky-700 flex items-center gap-1 font-mono">
                        <span>📍 {item.locationName}</span>
                        {item.isInferredLocation && (
                          <span className="text-stone-400 italic">(approx location)</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 text-center">
              <a
                href="https://pib.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-stone-500 hover:text-stone-800 underline"
              >
                Browse Press Information Bureau portal &rarr;
              </a>
            </div>
          </Card>
        </div>

        {/* Recent Cases Ledger */}
        <div className="lg:col-span-7">
          <RecentCases />
        </div>
      </div>
    </div>
  );
}
