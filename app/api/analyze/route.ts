import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/response';
import { getIncident, getReadings, createAnalysis, getStation } from '@/lib/db';
import { runAnalysis } from '@/lib/analysis';
import { explain, ExplainFacts } from '@/lib/ai';
import { AnalyzeSchema } from '@/lib/schemas';
import seedData from '@/data/seed.json';

export async function POST(req: NextRequest) {
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

  const incidentData = await getIncident(parsed.data.incidentId);
  if (!incidentData) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  const { incident } = incidentData;
  const readings = await getReadings(incident.stationId, incident.pollutant, 30);
  const station = await getStation(incident.stationId);

  // Match official standard from seed
  const standardObj = (seedData.standards || []).find((s) => s.pollutant === incident.pollutant) || {
    name: 'CPCB NAAQS',
    clause: `${incident.pollutant}, 24-hour average`,
    limit: incident.pollutant === 'PM10' ? 100 : 60,
    unit: 'µg/m³',
    averagingPeriod: '24h',
    excerpt: `The National Ambient Air Quality Standards (NAAQS) prescribed by CPCB set the 24-hour average standard for ${incident.pollutant}.`,
  };

  // 1. Deterministic math analysis (z-score, threshold, forecast)
  const mathResult = runAnalysis({
    incident,
    readings,
    standard: standardObj,
  });

  const cacheKey = `analysis:${incident.id}`;
  const explainFacts: ExplainFacts = {
    pollutant: incident.pollutant,
    stationName: station?.name || incident.locationName,
    observed: mathResult.threshold.observed,
    averagingPeriod: mathResult.threshold.averagingPeriod,
    limit: mathResult.threshold.limit,
    standardName: standardObj.name,
    clause: standardObj.clause,
    standardExcerpt: standardObj.excerpt,
    exceeded: mathResult.threshold.exceeded,
    ratio: mathResult.threshold.ratio,
    zScore: mathResult.zScore,
    dataQuality: mathResult.dataQuality,
    isAnomaly: mathResult.isAnomaly,
  };

  // 2. AI or rule-based statutory explanation
  const { result, cacheHit, fallback } = await explain(cacheKey, explainFacts);

  // 3. Save analysis to database / memory
  const savedAnalysis = await createAnalysis(incident.id, {
    incidentId: incident.id,
    isAnomaly: mathResult.isAnomaly,
    zScore: mathResult.zScore,
    forecast: mathResult.forecast,
    threshold: mathResult.threshold,
    standardRef: {
      name: standardObj.name,
      clause: standardObj.clause,
      excerpt: standardObj.excerpt,
    },
    currentAqi: mathResult.currentAqi,
    aqiBucket: mathResult.aqiBucket,
    dataQuality: mathResult.dataQuality,
    unknowns: [...mathResult.unknowns, ...result.unknowns],
    explanation: result.explanation,
    nextStep: result.nextStep,
    cacheHit,
    fallback,
  });

  return ok(savedAnalysis);
}
