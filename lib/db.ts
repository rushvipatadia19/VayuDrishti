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

// CPCB AQI breakpoints:
// 0–12        → 0–50    → Good
// 12.1–35.4   → 51–100  → Satisfactory
// 35.5–55.4   → 101–150 → Moderate
// 55.5–150.4  → 151–250 → Poor
// 150.5–250.4 → 251–350 → Very Poor
// 250.5+      → 351–500 → Severe
export function calculateAqiFromPm25(pm25: number | null): { aqi: number | null; aqiBucket: string | null } {
  if (pm25 === null || isNaN(pm25)) {
    return { aqi: null, aqiBucket: null };
  }
  let aqi: number;
  let aqiBucket: string;

  if (pm25 <= 12) {
    aqi = Math.round((pm25 / 12) * 50);
    aqiBucket = 'Good';
  } else if (pm25 <= 35.4) {
    aqi = Math.round(51 + ((pm25 - 12.1) / (35.4 - 12.1)) * (100 - 51));
    aqiBucket = 'Satisfactory';
  } else if (pm25 <= 55.4) {
    aqi = Math.round(101 + ((pm25 - 35.5) / (55.4 - 35.5)) * (150 - 101));
    aqiBucket = 'Moderate';
  } else if (pm25 <= 150.4) {
    aqi = Math.round(151 + ((pm25 - 55.5) / (150.4 - 55.5)) * (250 - 151));
    aqiBucket = 'Poor';
  } else if (pm25 <= 250.4) {
    aqi = Math.round(251 + ((pm25 - 150.5) / (250.4 - 150.5)) * (350 - 251));
    aqiBucket = 'Very Poor';
  } else {
    const capped = Math.min(pm25, 500);
    aqi = Math.round(351 + ((capped - 250.5) / (500 - 250.5)) * (500 - 351));
    aqiBucket = 'Severe';
  }
  return { aqi: Math.max(0, Math.min(500, aqi)), aqiBucket };
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
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .order('measured_at', { ascending: false });

      if (!error && data && data.length > 0) {
        isSupabaseAvailable = true;
        const camelReadings = toCamel<Reading[]>(data);
        return stations.map((stn) => {
          const stnReadings = camelReadings.filter((r) => r.stationId === stn.id);
          const latestPm25Reading = stnReadings.find((r) => r.pollutant === 'PM2.5');
          const latestPm10Reading = stnReadings.find((r) => r.pollutant === 'PM10');
          const latestPm25 = latestPm25Reading ? latestPm25Reading.value : null;
          const latestPm10 = latestPm10Reading ? latestPm10Reading.value : null;
          const { aqi, aqiBucket } = calculateAqiFromPm25(latestPm25);
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
    } catch {
      // Supabase failed, continue to fallback
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
    const { aqi, aqiBucket } = calculateAqiFromPm25(latestPm25);
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
          .single();

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
      const insertData = toSnake<Record<string, unknown>>({
        ...analysisInput,
        incidentId,
        createdAt: now,
      });

      const { data: resData, error: resError } = await supabase
        .from('analyses')
        .insert(insertData)
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

