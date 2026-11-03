'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StationSummary } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PhotoUpload } from './PhotoUpload';
import { LocationSearch } from './LocationSearch';
import { GeocodeResult } from '@/app/api/geocode/route';

interface ReportFormProps {
  stations?: StationSummary[];
}

export function ReportForm({ stations: initialStations }: ReportFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stations, setStations] = useState<StationSummary[]>(initialStations || []);
  const preselectedStationId = searchParams.get('stationId') || 'stn-01';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollutant, setPollutant] = useState<'PM2.5' | 'PM10'>('PM2.5');
  const [reportedValue, setReportedValue] = useState<string>('');
  const [stationId, setStationId] = useState(preselectedStationId);
  const [locationName, setLocationName] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stations.length === 0) {
      fetch('/api/stations')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setStations(json.data);
          }
        });
    }
  }, [stations.length]);

  useEffect(() => {
    if (!locationName && stations.length > 0) {
      const match = stations.find((s) => s.id === stationId);
      if (match) {
        setLocationName(`${match.name}, ${match.state}`);
        setSelectedCoords({ lat: match.lat, lng: match.lng });
      }
    }
  }, [stationId, stations, locationName]);

  function handleLocationSelected(geo: GeocodeResult) {
    setLocationName(geo.formatted);
    setSelectedCoords({ lat: geo.lat, lng: geo.lng });

    let nearestStn = stations[0];
    let minDistance = Infinity;

    stations.forEach((stn) => {
      const dist = Math.hypot(stn.lat - geo.lat, stn.lng - geo.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestStn = stn;
      }
    });

    if (nearestStn) {
      setStationId(nearestStn.id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a brief title describing the incident.');
      return;
    }

    if (!locationName.trim()) {
      setError('Please search and select a specific location in India.');
      return;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      pollutant,
      reportedValue: reportedValue ? parseFloat(reportedValue) : null,
      stationId,
      locationName: locationName.trim(),
      lat: selectedCoords?.lat ?? null,
      lng: selectedCoords?.lng ?? null,
      imageUrl: imageUrl || null,
    };

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.id) {
        throw new Error(json.error || 'Failed to submit incident');
      }

      const incidentId = String(json.data.id).trim();
      if (!incidentId) {
        throw new Error('Received invalid incident identifier from server');
      }

      router.push(`/cases/${encodeURIComponent(incidentId)}`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Submission failed. Please check network.');
      setSubmitting(false);
    }
  }

  const selectedStation = stations.find((s) => s.id === stationId);

  return (
    <Card className="p-6 md:p-8 bg-white border-stone-200 shadow-sm max-w-2xl mx-auto rounded-xl">
      <div className="mb-6 border-b border-stone-100 pb-4">
        <h2 className="text-xl font-serif font-bold text-stone-900">
          File an Environmental Incident Report
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Submit verifiable air quality concerns, visible dust/smoke plumes, or odor observations.
          Your report will be mapped and analyzed against official CPCB NAAQS standards.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Search Location in India *
          </label>
          <LocationSearch onSelect={handleLocationSelected} initialValue={locationName} />
          {selectedStation && (
            <p className="text-[11px] text-stone-500 mt-1.5">
              Nearest baseline station:{' '}
              <span className="font-semibold text-stone-700">{selectedStation.name}</span> ({selectedStation.state}) · Historical baseline data will provide regional context.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Incident Headline / Summary *
          </label>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dense black smoke and burning odor near industrial estate"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Primary Pollutant *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPollutant('PM2.5')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                  pollutant === 'PM2.5'
                    ? 'bg-emerald-900 text-white border-emerald-900'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                PM2.5 (Fine particles)
              </button>
              <button
                type="button"
                onClick={() => setPollutant('PM10')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                  pollutant === 'PM10'
                    ? 'bg-emerald-900 text-white border-emerald-900'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                PM10 (Coarse dust)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Reported Value (Optional, µg/m³)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              max="2000"
              value={reportedValue}
              onChange={(e) => setReportedValue(e.target.value)}
              placeholder="e.g. 142 (if measured)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Observations & Details
          </label>
          <textarea
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe visibility conditions, physical irritation, wind direction, suspected emission sources, or duration of episode..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
            Attach Photographic Evidence
          </label>
          <PhotoUpload onUploadComplete={(url) => setImageUrl(url)} />
          <p className="text-[11px] text-stone-400 mt-1">
            Submitted images are stored permanently for official case audit trails and downloadable PDF reports.
          </p>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={submitting}
            className="text-stone-600 hover:text-stone-900"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-6 font-semibold shadow-sm"
          >
            {submitting ? 'Submitting Case...' : 'Submit Incident Report'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
