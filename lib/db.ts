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
} from '@/lib/types';
import { pm25ToAqi, pm10ToAqi } from '@/lib/aqi';
import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

// In-memory fallback stores
const memoryIncidents: Incident[] = (seedData.incidents || []).map((inc) => toCamel<Incident>(inc));
const memoryEvents: CaseEvent[] = [];
const memoryAnalyses: Analysis[] = [];

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
    // Sort newest first
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

      if (!error && data) {
        const camel = toCamel<Reading[]>(data);
        // oldest first
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

      if (!error && data) {
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

  // Fallback
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
  imageUrl?: string | null;
}

export async function createIncident(data: CreateIncidentInput): Promise<Incident> {
  const station = await getStation(data.stationId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const insertData = toSnake<Record<string, unknown>>({
        title: data.title,
        description: data.description || null,
        pollutant: data.pollutant,
        reportedValue: data.reportedValue ?? null,
        stationId: data.stationId,
        locationName: data.locationName,
        lat: station?.lat || null,
        lng: station?.lng || null,
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

  // Fallback
  const id = `inc-${Date.now()}`;
  const incident: Incident = {
    id,
    title: data.title,
    description: data.description || '',
    pollutant: data.pollutant,
    reportedValue: data.reportedValue ?? null,
    stationId: data.stationId,
    locationName: data.locationName,
    lat: station?.lat || null,
    lng: station?.lng || null,
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
          forecast: analysisInput.forecast, // JSONB — pass as-is
          threshold: analysisInput.threshold, // JSONB — pass as-is
          standard_ref: analysisInput.standardRef, // JSONB — pass as-is
          current_aqi: analysisInput.currentAqi,
          aqi_bucket: analysisInput.aqiBucket,
          data_quality: analysisInput.dataQuality,
          unknowns: analysisInput.unknowns, // JSONB — pass as-is
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

        // Case event text is first sentence of explanation
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
        // Log status change event
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
      // Continue to fallback
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
