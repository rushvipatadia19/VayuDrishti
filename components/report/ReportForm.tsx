'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import type { StationSummary, Incident } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { PhotoUpload } from './PhotoUpload';

export function ReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledStationId = searchParams.get('stationId') || 'stn-01';

  const { data: stations, loading: stationsLoading, error: stationsError } =
    useApi<StationSummary[]>('/api/stations');

  const [stationId, setStationId] = useState(prefilledStationId);
  const [pollutant, setPollutant] = useState<'PM2.5' | 'PM10'>('PM2.5');
  const [reportedValue, setReportedValue] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Add a short title (up to 120 characters).');
      return;
    }
    if (title.length > 120) {
      setFormError('Keep the title under 120 characters.');
      return;
    }
    if (description.length > 1000) {
      setFormError('Keep the description under 1000 characters.');
      return;
    }

    const numValue = reportedValue.trim() ? parseFloat(reportedValue) : null;
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 2000)) {
      setFormError('Enter a value between 0 and 2000, or leave it blank.');
      return;
    }

    const selectedStation = stations?.find((s) => s.id === stationId);
    const locationName = selectedStation ? `${selectedStation.city}, ${selectedStation.state}` : 'Unknown Location';

    setSubmitting(true);
    try {
      const created = await api<Incident>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          pollutant,
          reportedValue: numValue,
          stationId,
          locationName,
          imageUrl: imageUrl || null,
        }),
      });

      router.push(`/cases/${created.id}`);
    } catch (err) {
      setFormError((err as Error).message || 'Failed to submit incident');
      setSubmitting(false);
    }
  }

  if (stationsLoading) {
    return (
      <Card className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (stationsError) {
    return <ErrorBanner message={stationsError} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Report an air-quality concern
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Submit observed haze, smoke, or sensor readings to initiate an evidence-based compliance case.
        </p>
      </div>

      <Card className="p-6">
        {formError && (
          <div className="mb-6">
            <ErrorBanner message={formError} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <div>
            <label htmlFor="station-select" className="block text-sm font-semibold text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              id="station-select"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {stations?.map((stn) => (
                <option key={stn.id} value={stn.id}>
                  {stn.city}, {stn.state} ({stn.name})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Select the nearest CPCB monitoring station node.
            </p>
          </div>

          {/* Pollutant Selection */}
          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-2">
              Pollutant of Concern <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="pollutant"
                  value="PM2.5"
                  checked={pollutant === 'PM2.5'}
                  onChange={() => setPollutant('PM2.5')}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span>PM2.5 (Fine Respirable Dust)</span>
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="pollutant"
                  value="PM10"
                  checked={pollutant === 'PM10'}
                  onChange={() => setPollutant('PM10')}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span>PM10 (Coarse Particulate)</span>
              </label>
            </div>
          </div>

          {/* Observed Value */}
          <div>
            <label htmlFor="observed-value" className="block text-sm font-semibold text-gray-700 mb-1">
              Observed Value in µg/m³ (optional)
            </label>
            <input
              id="observed-value"
              type="number"
              step="0.1"
              min="0"
              max="2000"
              placeholder="e.g. 142"
              value={reportedValue}
              onChange={(e) => setReportedValue(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank if reporting visual smoke, odour, or unmetered smog.
            </p>
          </div>

          {/* Short Title */}
          <div>
            <label htmlFor="incident-title" className="block text-sm font-semibold text-gray-700 mb-1">
              Incident Title <span className="text-red-500">*</span>
            </label>
            <input
              id="incident-title"
              type="text"
              maxLength={120}
              placeholder="e.g. Dense industrial haze near north gate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Clear, factual one-sentence summary.</span>
              <span className="text-xs text-gray-400">{title.length}/120</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="incident-desc" className="block text-sm font-semibold text-gray-700 mb-1">
              Observations & Context (optional)
            </label>
            <textarea
              id="incident-desc"
              rows={4}
              maxLength={1000}
              placeholder="Describe visibility, wind patterns, symptoms, or nearby industrial operations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">Do not name individual persons or facilities without verification.</span>
              <span className="text-xs text-gray-400">{description.length}/1000</span>
            </div>
          </div>

          {/* Evidence Photo */}
          <div className="border-t border-border pt-4">
            <PhotoUpload onUpload={(url) => setImageUrl(url)} />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="w-full py-3 text-base font-semibold"
            >
              Submit report
            </Button>
            <p className="text-xs text-center text-gray-500 mt-3">
              Reports support human review and are not official regulatory decisions.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
