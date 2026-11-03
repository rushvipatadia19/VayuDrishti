import { notFound } from 'next/navigation';
import { getIncident, getReadings } from '@/lib/db';
import { CaseView } from '@/components/case/CaseView';

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getIncident(id);

  if (!result) {
    notFound();
  }

  const readings = await getReadings(result.incident.stationId, result.incident.pollutant, 30);

  return (
    <CaseView
      initialIncident={result.incident}
      initialEvents={result.events}
      initialAnalysis={result.analysis}
      readings={readings}
    />
  );
}
