export type Pollutant = 'PM2.5' | 'PM10';
export type CaseStatus = 'open' | 'under_review' | 'action_taken' | 'closed';

export interface Station {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface StationSummary extends Station {
  latestPm25: number | null;
  latestPm10: number | null;
  aqi: number | null;
  aqiBucket: string | null; // CPCB bands: Good, Satisfactory, Moderate, Poor, Very Poor, Severe
  measuredAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  pollutant: Pollutant;
  reportedValue: number | null;
  stationId: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string | null;
  status: CaseStatus;
  createdAt: string;
}

export interface Reading {
  id: string;
  stationId: string;
  pollutant: Pollutant;
  value: number;
  aqi: number | null;
  aqiBucket: string | null;
  measuredAt: string;
}

export interface ThresholdCheck {
  limit: number;
  unit: 'µg/m³';
  averagingPeriod: string;
  standard: string;
  observed: number;
  exceeded: boolean;
  ratio: number; // observed / limit
}

export interface StandardRef {
  name: string;
  clause: string;
  excerpt: string;
}

export interface Analysis {
  id: string;
  incidentId: string;
  isAnomaly: boolean;
  zScore: number;
  forecast: { t: string; value: number }[];
  threshold: ThresholdCheck;
  standardRef: StandardRef;
  currentAqi: number | null;
  aqiBucket: string | null;
  dataQuality: 'valid' | 'stale' | 'implausible' | 'missing';
  unknowns: string[];
  explanation: string;
  nextStep: string;
  cacheHit: boolean;
  fallback: boolean;
  createdAt: string;
}

export interface CaseEvent {
  id: string;
  incidentId: string;
  kind: 'report' | 'analysis' | 'action' | 'status_change';
  text: string;
  imageUrl: string | null;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus | null;
  createdAt: string;
}

export interface ApiOk<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErr {
  success: false;
  error: string;
  code?: string;
}

export type SourceType = 'official' | 'scientific' | 'technical' | 'journalism';

export interface ResearchSource {
  id: string; // e.g. "S1", "S2"
  title: string;
  url: string;
  publisher: string;
  domain: string;
  publishedAt: string | null;
  retrievedAt: string;
  relevantExcerpt: string;
  sourceType: SourceType;
  verificationStatus: string;
}

export interface SimilarIncidentCase {
  title: string;
  location: string;
  timePeriod: string;
  pollutant: string;
  conditions: string;
  authorityInvolved: string;
  documentedResponse: string;
  reportedOutcome: string;
  relevance: string;
  limitations: string;
  citationIds: string[];
}

export interface ActionPlanRecommendation {
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  why: string;
  incidentEvidence: string;
  historicalOrGuidanceEvidence: string;
  citationIds: string[];
  suggestedRole: string;
  preconditionsAndLimitations: string;
  verificationStep: string;
}

export interface IncidentResearch {
  id: string;
  incidentId: string;
  summary: string;
  similarIncidents: SimilarIncidentCase[];
  recommendedActions: ActionPlanRecommendation[];
  sources: ResearchSource[];
  limitations: string[];
  createdAt: string;
}


