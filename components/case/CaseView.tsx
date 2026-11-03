'use client';
import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import type { Incident, CaseEvent, Analysis, Reading, CaseStatus } from '@/lib/types';
import { CaseHeader } from './CaseHeader';
import { InfoCards } from './InfoCards';
import { CaseReadingsChart } from './CaseReadingsChart';
import { AnalysisPanel } from './AnalysisPanel';
import { ActionForm } from './ActionForm';
import { Timeline } from './Timeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

export function CaseView({ incidentId }: { incidentId: string }) {
  // 1. Fetch incident, events and latest analysis
  const {
    data: caseData,
    loading: caseLoading,
    error: caseError,
    refetch: refetchCase,
  } = useApi<{
    incident: Incident;
    events: CaseEvent[];
    analysis: Analysis | null;
  }>(`/api/incidents/${incidentId}`);

  // 2. Fetch 30-day baseline readings for the incident's station
  const stationId = caseData?.incident.stationId;
  const pollutant = caseData?.incident.pollutant ?? 'PM2.5';

  const {
    data: readings,
    loading: readingsLoading,
    error: readingsError,
    refetch: refetchReadings,
  } = useApi<Reading[]>(
    stationId ? `/api/stations/${stationId}/readings?pollutant=${pollutant}&days=30` : ''
  );

  const [analyzing, setAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);

  // Sync analysis from server or state
  const currentAnalysis = activeAnalysis || caseData?.analysis || null;

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await api<Analysis>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ incidentId }),
      });
      setActiveAnalysis(res);
      await refetchCase();
    } catch {
      // Error handled cleanly inside backend (explain fallback always succeeds)
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddAction(text: string, imageUrl: string | null) {
    await api<CaseEvent>(`/api/incidents/${incidentId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        kind: 'action',
        text,
        imageUrl: imageUrl || null,
      }),
    });
    await refetchCase();
  }

  async function handleStatusChange(newStatus: CaseStatus, reason?: string) {
    await api<Incident>(`/api/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        reason,
      }),
    });
    await refetchCase();
  }

  if (caseLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (caseError || !caseData) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={caseError || 'Case not found'} onRetry={refetchCase} />
      </div>
    );
  }

  const { incident, events } = caseData;
  const standardLimit = pollutant === 'PM2.5' ? 60 : 100;

  return (
    <div className="space-y-8">
      {/* 1. Header with Status Stepper */}
      <CaseHeader incident={incident} />

      {/* 2. Four Infographic Cards */}
      <InfoCards analysis={currentAnalysis} loading={analyzing} />

      {/* 3. 30-Day Line Chart with Baseline & Forecast */}
      <CaseReadingsChart
        readings={readings}
        forecast={currentAnalysis?.forecast}
        pollutant={pollutant}
        limit={standardLimit}
        loading={readingsLoading}
        error={readingsError}
        onRetry={refetchReadings}
      />

      {/* 4. Analysis & Statutory Explanation Panel */}
      <AnalysisPanel
        analysis={currentAnalysis}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {/* 5. Corrective Action Form & Advance Status */}
      <ActionForm
        incidentId={incident.id}
        currentStatus={incident.status}
        onActionAdded={handleAddAction}
        onStatusChanged={handleStatusChange}
      />

      {/* 6. Case History / Timeline */}
      <Timeline events={events} />
    </div>
  );
}
