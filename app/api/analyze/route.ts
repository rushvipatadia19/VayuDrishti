import { ok, fail } from '@/lib/response';
import { getIncident, getReadings, createAnalysis } from '@/lib/db';
import { runAnalysis } from '@/lib/analysis';
import { explain, ExplainFacts } from '@/lib/ai';
import { AnalyzeSchema } from '@/lib/schemas';
import seedData from '@/data/seed.json';
import type { Analysis } from '@/lib/types';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const { incidentId } = parsed.data;
  const result = await getIncident(incidentId);
  if (!result) {
    return fail('Not found', 404, 'NOT_FOUND');
  }
  const { incident } = result;

  // Load standard from seed.json standards array
  // Match by pollutant: if incident.pollutant === 'PM2.5' use the PM2.5 24h standard.
  // If incident.pollutant === 'PM10' use the PM10 24h standard.
  const standard = (seedData.standards || []).find(
    (s) => s.pollutant === incident.pollutant && s.averagingPeriod === '24h' && s.name.includes('CPCB')
  ) || seedData.standards[0];

  const readings = await getReadings(incident.stationId, incident.pollutant, 30);

  const computed = runAnalysis({ incident, readings, standard });

  const facts: ExplainFacts = {
    pollutant: incident.pollutant,
    stationName: incident.locationName,
    observed: incident.reportedValue ?? readings.at(-1)?.value ?? 0,
    averagingPeriod: standard.averagingPeriod,
    limit: standard.limit,
    standardName: standard.name,
    clause: standard.clause,
    standardExcerpt: standard.excerpt,
    exceeded: computed.threshold.exceeded,
    ratio: computed.threshold.ratio,
    zScore: computed.zScore,
    dataQuality: computed.dataQuality,
    isAnomaly: computed.isAnomaly,
  };

  // The analysis cache order is: data/ai-cache.json → in-memory Map → HF call → fallback.
  // Cache key for seeded incidents = incidentId.
  // Cache key for new incidents = `${stationId}|${pollutant}|${Math.round(reportedValue)}`.
  const isSeededIncident = ['inc-demo-1', 'inc-demo-2', 'inc-demo-3'].includes(incidentId);
  const cacheKey = isSeededIncident
    ? incidentId
    : `${incident.stationId}|${incident.pollutant}|${Math.round(facts.observed)}`;

  const { result: aiResult, cacheHit, fallback } = await explain(cacheKey, facts);

  const analysisInput: Omit<Analysis, 'id' | 'createdAt'> = {
    incidentId,
    isAnomaly: computed.isAnomaly,
    zScore: computed.zScore,
    forecast: computed.forecast,
    threshold: computed.threshold,
    standardRef: {
      name: standard.name,
      clause: standard.clause,
      excerpt: standard.excerpt,
    },
    currentAqi: computed.currentAqi,
    aqiBucket: computed.aqiBucket,
    dataQuality: computed.dataQuality,
    unknowns: computed.unknowns,
    explanation: aiResult.explanation,
    nextStep: aiResult.nextStep,
    cacheHit,
    fallback,
  };

  const analysis = await createAnalysis(incidentId, analysisInput);
  return ok(analysis);
}

