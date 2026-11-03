'use client';

import React, { useState } from 'react';
import { Incident, CaseEvent, Analysis, Reading } from '@/lib/types';
import { CaseHeader } from './CaseHeader';
import { InfoCards } from './InfoCards';
import { CaseReadingsChart } from './CaseReadingsChart';
import { AnalysisPanel } from './AnalysisPanel';
import { ActionForm } from './ActionForm';
import { Timeline } from './Timeline';
import { generateCasePdf } from '@/lib/pdf';
import { Button } from '@/components/ui/Button';
import { VayuAssistant } from '@/components/chat/VayuAssistant';

interface CaseViewProps {
  initialIncident: Incident;
  initialEvents: CaseEvent[];
  initialAnalysis: Analysis | null;
  readings: Reading[];
}

export function CaseView({
  initialIncident,
  initialEvents,
  initialAnalysis,
  readings: initialReadings,
}: CaseViewProps) {
  const [incident, setIncident] = useState<Incident>(initialIncident);
  const [events, setEvents] = useState<CaseEvent[]>(initialEvents);
  const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis);
  const [readings] = useState<Reading[]>(initialReadings);
  const [analyzing, setAnalyzing] = useState(false);

  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!incident || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Analysis failed');
      }
      setAnalysis(json.data);

      // Add analysis event to timeline
      const now = new Date().toISOString();
      const firstSentence = (json.data.explanation || '').split('.')[0] + '.';
      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          incidentId: incident.id,
          kind: 'analysis',
          text: firstSentence,
          imageUrl: null,
          fromStatus: null,
          toStatus: null,
          createdAt: now,
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDownloadPdf() {
    if (!incident) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      await generateCasePdf({
        incident,
        events,
        analysis,
        readings,
      });
    } catch {
      setPdfError('Failed to generate PDF report. Please verify image and network status.');
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar with PDF Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <div className="text-xs text-stone-500 font-mono">
            CASE RECORD · ID: {incident.id}
          </div>
          <div className="text-sm font-semibold text-stone-800">
            {incident.title}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {pdfError && (
            <span className="text-xs text-rose-600 font-medium">{pdfError}</span>
          )}
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfGenerating}
            className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 rounded-lg shadow-sm transition"
          >
            {pdfGenerating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Generating Audit PDF...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Complete Report (PDF)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Case Header & Workflow Progress Stepper */}
      <CaseHeader incident={incident} />

      {/* 4 Infographic Cards */}
      <InfoCards analysis={analysis} loading={analyzing} />

      {/* Evidence Photograph Banner (If attached) */}
      {incident.imageUrl && (
        <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col md:flex-row gap-4 items-center">
          <img
            src={incident.imageUrl}
            alt="Uploaded incident evidence"
            className="w-full md:w-56 h-36 object-cover rounded-lg border border-stone-300 shadow-inner"
          />
          <div className="flex-1 text-xs space-y-1.5 text-stone-600">
            <div className="font-semibold text-stone-900 text-sm">
              Attached Incident Photographic Evidence
            </div>
            <div>
              <span className="font-semibold">Observation Location:</span> {incident.locationName}
              {incident.lat && incident.lng ? ` (${incident.lat.toFixed(4)}°N, ${incident.lng.toFixed(4)}°E)` : ''}
            </div>
            <div>
              <span className="font-semibold">Reported Pollutant:</span> {incident.pollutant} (Observed value: {incident.reportedValue ?? 'Not specified'} µg/m³)
            </div>
            <div className="text-stone-400 text-[11px] pt-1">
              Permanent evidence record · Preserved in case chain of custody and embedded into generated audit PDFs.
            </div>
          </div>
        </div>
      )}

      {/* Historical Station Baseline & 3-Day Forecast Chart */}
      <CaseReadingsChart
        readings={readings}
        forecast={analysis?.forecast}
        pollutant={incident.pollutant}
        limit={analysis?.threshold?.limit ?? (incident.pollutant === 'PM10' ? 100 : 60)}
        loading={false}
        error={null}
        onRetry={() => {}}
      />

      {/* Explainable Statutory Analysis Panel */}
      <AnalysisPanel
        analysis={analysis}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {/* Corrective Action Form for Officers */}
      <ActionForm
        incident={incident}
        onEventAdded={(ev) => setEvents((prev) => [ev, ...prev])}
      />

      {/* Complete Audit Trail Timeline */}
      <Timeline events={events} />

      {/* Context-aware assistant on case page */}
      <VayuAssistant
        caseContext={{
          incidentId: incident.id,
          title: incident.title,
          pollutant: incident.pollutant,
          reportedValue: incident.reportedValue,
          stationName: incident.locationName,
          status: incident.status,
          isAnomaly: analysis?.isAnomaly,
          standardLimit: analysis?.threshold?.limit,
          exceeded: analysis?.threshold?.exceeded,
          explanation: analysis?.explanation,
        }}
      />
    </div>
  );
}
