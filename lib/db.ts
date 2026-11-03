import seedData from '@/data/seed.json';
import type {
  Incident,
  Reading,
  Analysis,
  CaseEvent,
  CaseStatus,
  Pollutant,
  Station,
  StationSummary,
  IncidentResearch,
} from '@/lib/types';
import { pm25ToAqi, pm10ToAqi } from '@/lib/aqi';
import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export let isSupabaseAvailable = false;

// Generic snake_case to camelCase conversion
export function toCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamel(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      newObj[camelKey] = toCamel(value);
    }
    return newObj as T;
  }
  return obj as T;
}

// Generic camelCase to snake_case conversion
export function toSnake<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnake(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const newObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = toSnake(value);
    }
    return newObj as T;
  }
  return obj as T;
}

// Persistent process-level store across Next.js dev bundles (Page SSR vs API Route Handler)
declare global {
  // eslint-disable-next-line no-var
  var __vayu_memory_incidents: Incident[] | undefined;
  // eslint-disable-next-line no-var
  var __vayu_memory_events: CaseEvent[] | undefined;
  // eslint-disable-next-line no-var
  var __vayu_memory_analyses: Analysis[] | undefined;
  // eslint-disable-next-line no-var
  var __vayu_memory_research: IncidentResearch[] | undefined;
}

if (!globalThis.__vayu_memory_incidents) {
  globalThis.__vayu_memory_incidents = (seedData.incidents || []).map((inc) => toCamel<Incident>(inc));
}
if (!globalThis.__vayu_memory_events) {
  globalThis.__vayu_memory_events = [];
}
if (!globalThis.__vayu_memory_analyses) {
  globalThis.__vayu_memory_analyses = [];
}
if (!globalThis.__vayu_memory_research) {
  globalThis.__vayu_memory_research = [];
}

const memoryIncidents: Incident[] = globalThis.__vayu_memory_incidents;
const memoryEvents: CaseEvent[] = globalThis.__vayu_memory_events;
const memoryAnalyses: Analysis[] = globalThis.__vayu_memory_analyses;
const memoryResearch: IncidentResearch[] = globalThis.__vayu_memory_research;

// Enforce transition rules
export function isAllowedTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === 'open' && to === 'under_review') return true;
  if (from === 'under_review' && (to === 'action_taken' || to === 'open')) return true;
  if (from === 'action_taken' && (to === 'closed' || to === 'under_review')) return true;
  return false;
}

export async function getStation(id: string): Promise<Station | null> {
  const station = (seedData.stations as Station[]).find((s) => s.id === id);
  return station || null;
}

export async function getStations(): Promise<StationSummary[]> {
  const stations = seedData.stations as Station[];

  if (supabase) {
    try {
      isSupabaseAvailable = true;
      const results = await Promise.all(
        stations.map(async (stn) => {
          const [pm25Res, pm10Res] = await Promise.all([
            supabase!
              .from('readings')
              .select('value, measured_at')
              .eq('station_id', stn.id)
              .eq('pollutant', 'PM2.5')
              .order('measured_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase!
              .from('readings')
              .select('value, measured_at')
              .eq('station_id', stn.id)
              .eq('pollutant', 'PM10')
              .order('measured_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
          const latestPm25 = pm25Res.data?.value ?? null;
          const latestPm10 = pm10Res.data?.value ?? null;
          const { aqi, aqiBucket } = latestPm25 !== null
            ? pm25ToAqi(latestPm25)
            : { aqi: null, aqiBucket: null };
          const measuredAt =
            pm25Res.data?.measured_at ??
            pm10Res.data?.measured_at ??
            new Date().toISOString();
          return { ...stn, latestPm25, latestPm10, aqi, aqiBucket, measuredAt };
        })
      );
      return results;
    } catch {
      // fall through to seed fallback
      isSupabaseAvailable = false;
    }
  }

  // Fallback to seed.json
  const seedReadings = toCamel<Reading[]>(seedData.readings);
  return stations.map((stn) => {
    const stnReadings = seedReadings.filter((r) => r.stationId === stn.id);
    stnReadings.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    const latestPm25Reading = stnReadings.find((r) => r.pollutant === 'PM2.5');
    const latestPm10Reading = stnReadings.find((r) => r.pollutant === 'PM10');
    const latestPm25 = latestPm25Reading ? latestPm25Reading.value : null;
    const latestPm10 = latestPm10Reading ? latestPm10Reading.value : null;
    const { aqi, aqiBucket } = latestPm25 !== null
      ? pm25ToAqi(latestPm25)
      : { aqi: null, aqiBucket: null };
    const measuredAt = latestPm25Reading?.measuredAt || latestPm10Reading?.measuredAt || new Date().toISOString();

    return {
      ...stn,
      latestPm25,
      latestPm10,
      aqi,
      aqiBucket,
      measuredAt,
    };
  });
}

export async function getReadings(stationId: string, pollutant: Pollutant, days: number): Promise<Reading[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('station_id', stationId)
        .eq('pollutant', pollutant)
        .order('measured_at', { ascending: false })
        .limit(days);

      if (!error && data && data.length > 0) {
        const camel = toCamel<Reading[]>(data);
        return camel.reverse();
      }
    } catch {
      // Supabase failed, continue to fallback
    }
  }

  // Fallback
  const seedReadings = toCamel<Reading[]>(seedData.readings);
  const filtered = seedReadings
    .filter((r) => r.stationId === stationId && r.pollutant === pollutant)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
    .slice(0, days);

  return filtered.reverse();
}

export async function listIncidents(): Promise<Incident[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return toCamel<Incident[]>(data);
      }
    } catch {
      // Fallback
    }
  }

  return [...memoryIncidents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getIncident(id: string): Promise<{
  incident: Incident;
  events: CaseEvent[];
  analysis: Analysis | null;
} | null> {
  if (supabase) {
    try {
      const { data: incData, error: incError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (!incError && incData) {
        const incident = toCamel<Incident>(incData);

        const { data: eventsData } = await supabase
          .from('case_events')
          .select('*')
          .eq('incident_id', id)
          .order('created_at', { ascending: false });

        const { data: analysisData } = await supabase
          .from('analyses')
          .select('*')
          .eq('incident_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          incident,
          events: eventsData ? toCamel<CaseEvent[]>(eventsData) : [],
          analysis: analysisData ? toCamel<Analysis>(analysisData) : null,
        };
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to shared process memory
  const incident = memoryIncidents.find((i) => i.id === id);
  if (!incident) return null;

  const events = memoryEvents
    .filter((e) => e.incidentId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const analysis = memoryAnalyses
    .filter((a) => a.incidentId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

  return {
    incident,
    events,
    analysis,
  };
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  pollutant: Pollutant;
  reportedValue?: number | null;
  stationId: string;
  locationName: string;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
}

export async function createIncident(data: CreateIncidentInput): Promise<Incident> {
  const station = await getStation(data.stationId);
  const now = new Date().toISOString();
  const latitude = data.lat !== undefined && data.lat !== null ? data.lat : (station?.lat || null);
  const longitude = data.lng !== undefined && data.lng !== null ? data.lng : (station?.lng || null);

  if (supabase) {
    try {
      const insertData = toSnake<Record<string, unknown>>({
        title: data.title,
        description: data.description || null,
        pollutant: data.pollutant,
        reportedValue: data.reportedValue ?? null,
        stationId: data.stationId,
        locationName: data.locationName,
        lat: latitude,
        lng: longitude,
        imageUrl: data.imageUrl || null,
        status: 'open' as CaseStatus,
        createdAt: now,
      });

      const { data: incResult, error: incError } = await supabase
        .from('incidents')
        .insert(insertData)
        .select()
        .single();

      if (!incError && incResult) {
        const incident = toCamel<Incident>(incResult);

        // Insert case event
        await supabase.from('case_events').insert(
          toSnake<Record<string, unknown>>({
            incidentId: incident.id,
            kind: 'report',
            text: data.title,
            imageUrl: null,
            fromStatus: null,
            toStatus: null,
            createdAt: now,
          })
        );

        return incident;
      }
    } catch {
      // Fallback
    }
  }

  // Consistent fallback ID stored in process-global memory
  const id = `inc-${Date.now()}`;
  const incident: Incident = {
    id,
    title: data.title,
    description: data.description || '',
    pollutant: data.pollutant,
    reportedValue: data.reportedValue ?? null,
    stationId: data.stationId,
    locationName: data.locationName,
    lat: latitude,
    lng: longitude,
    imageUrl: data.imageUrl || null,
    status: 'open',
    createdAt: now,
  };

  memoryIncidents.unshift(incident);

  memoryEvents.unshift({
    id: `ev-${Date.now()}`,
    incidentId: id,
    kind: 'report',
    text: data.title,
    imageUrl: null,
    fromStatus: null,
    toStatus: null,
    createdAt: now,
  });

  return incident;
}

export async function createAnalysis(
  incidentId: string,
  analysisInput: Omit<Analysis, 'id' | 'createdAt'>
): Promise<Analysis> {
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: resData, error: resError } = await supabase
        .from('analyses')
        .insert({
          incident_id: incidentId,
          is_anomaly: analysisInput.isAnomaly,
          z_score: analysisInput.zScore,
          forecast: analysisInput.forecast,
          threshold: analysisInput.threshold,
          standard_ref: analysisInput.standardRef,
          current_aqi: analysisInput.currentAqi,
          aqi_bucket: analysisInput.aqiBucket,
          data_quality: analysisInput.dataQuality,
          unknowns: analysisInput.unknowns,
          explanation: analysisInput.explanation,
          next_step: analysisInput.nextStep,
          cache_hit: analysisInput.cacheHit,
          fallback: analysisInput.fallback,
          created_at: now,
        })
        .select()
        .single();

      if (!resError && resData) {
        const analysis = toCamel<Analysis>(resData);

        const firstSentence = analysisInput.explanation.split('.')[0] + '.';
        await supabase.from('case_events').insert(
          toSnake<Record<string, unknown>>({
            incidentId,
            kind: 'analysis',
            text: firstSentence,
            imageUrl: null,
            fromStatus: null,
            toStatus: null,
            createdAt: now,
          })
        );

        return analysis;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback
  const id = `an-${Date.now()}`;
  const analysis: Analysis = {
    ...analysisInput,
    id,
    createdAt: now,
  };

  memoryAnalyses.unshift(analysis);

  const firstSentence = analysisInput.explanation.split('.')[0] + '.';
  memoryEvents.unshift({
    id: `ev-${Date.now()}`,
    incidentId,
    kind: 'analysis',
    text: firstSentence,
    imageUrl: null,
    fromStatus: null,
    toStatus: null,
    createdAt: now,
  });

  return analysis;
}

export async function createEvent(
  incidentId: string,
  event: {
    kind: 'action';
    text: string;
    imageUrl: string | null;
  }
): Promise<CaseEvent | 'CLOSED' | null> {
  const existing = await getIncident(incidentId);
  if (!existing) return null;
  if (existing.incident.status === 'closed') return 'CLOSED';

  const now = new Date().toISOString();

  if (supabase) {
    try {
      const insertData = toSnake<Record<string, unknown>>({
        incidentId,
        kind: event.kind,
        text: event.text,
        imageUrl: event.imageUrl,
        fromStatus: null,
        toStatus: null,
        createdAt: now,
      });

      const { data, error } = await supabase
        .from('case_events')
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        return toCamel<CaseEvent>(data);
      }
    } catch {
      // Fallback
    }
  }

  const newEvent: CaseEvent = {
    id: `ev-${Date.now()}`,
    incidentId,
    kind: event.kind,
    text: event.text,
    imageUrl: event.imageUrl,
    fromStatus: null,
    toStatus: null,
    createdAt: now,
  };

  memoryEvents.unshift(newEvent);
  return newEvent;
}

export async function updateIncidentStatus(
  id: string,
  newStatus: CaseStatus,
  reason?: string
): Promise<Incident> {
  const existing = await getIncident(id);
  if (!existing) {
    const err = new Error('NOT_FOUND');
    err.name = 'NOT_FOUND';
    throw err;
  }

  const currentStatus = existing.incident.status;
  if (!isAllowedTransition(currentStatus, newStatus)) {
    const err = new Error('BAD_TRANSITION');
    err.name = 'BAD_TRANSITION';
    throw err;
  }

  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        await supabase.from('case_events').insert(
          toSnake<Record<string, unknown>>({
            incidentId: id,
            kind: 'status_change',
            text: reason ?? '',
            imageUrl: null,
            fromStatus: currentStatus,
            toStatus: newStatus,
            createdAt: now,
          })
        );

        return toCamel<Incident>(data);
      }
    } catch (e: unknown) {
      if ((e as Error)?.message === 'BAD_TRANSITION' || (e as Error)?.name === 'BAD_TRANSITION') {
        throw e;
      }
    }
  }

  // Fallback
  existing.incident.status = newStatus;
  memoryEvents.unshift({
    id: `ev-${Date.now()}`,
    incidentId: id,
    kind: 'status_change',
    text: reason ?? '',
    imageUrl: null,
    fromStatus: currentStatus,
    toStatus: newStatus,
    createdAt: now,
  });

  return existing.incident;
}

export async function getLatestResearch(incidentId: string): Promise<IncidentResearch | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('incident_research')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return toCamel<IncidentResearch>(data);
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  const match = memoryResearch
    .filter((r) => r.incidentId === incidentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return match || null;
}

export async function saveIncidentResearch(
  incidentId: string,
  researchData: Omit<IncidentResearch, 'id' | 'incidentId' | 'createdAt'> & { fingerprint?: string }
): Promise<IncidentResearch> {
  const now = new Date().toISOString();
  const id = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (supabase) {
    try {
      const record = {
        incident_id: incidentId,
        summary: researchData.summary,
        similar_incidents: researchData.similarIncidents,
        recommended_actions: researchData.recommendedActions,
        sources: researchData.sources,
        limitations: researchData.limitations,
        fingerprint: researchData.fingerprint || null,
        created_at: now,
      };

      const { data, error } = await supabase
        .from('incident_research')
        .insert(record)
        .select('*')
        .single();

      if (!error && data) {
        return toCamel<IncidentResearch>(data);
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  const newResearch: IncidentResearch = {
    id,
    incidentId,
    summary: researchData.summary,
    similarIncidents: researchData.similarIncidents,
    recommendedActions: researchData.recommendedActions,
    sources: researchData.sources,
    limitations: researchData.limitations,
    createdAt: now,
  };

  memoryResearch.unshift(newResearch);
  return newResearch;
}

