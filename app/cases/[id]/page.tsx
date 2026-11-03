import { notFound } from 'next/navigation';
import { getIncident, getReadings, getLatestResearch } from '@/lib/db';
import { CaseView } from '@/components/case/CaseView';

export default async function CasePage(props: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await props.params;
  const id = resolvedParams?.id;
  console.log(`[CasePage] Rendering case for id: "${id}"`);

  if (!id) {
    console.log('[CasePage] No id found in params, triggering notFound()');
    notFound();
  }

  const result = await getIncident(id);
  console.log(`[CasePage] getIncident("${id}") returned:`, result ? 'FOUND' : 'NULL');

  if (!result) {
    notFound();
  }

  const readings = await getReadings(result.incident.stationId, result.incident.pollutant, 30);
  const research = await getLatestResearch(id);

  return (
    <CaseView
      initialIncident={result.incident}
      initialEvents={result.events}
      initialAnalysis={result.analysis}
      initialResearch={research}
      readings={readings}
    />
  );
}
