import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/response';
import { getIncident, getLatestResearch, saveIncidentResearch } from '@/lib/db';
import { performIncidentResearch } from '@/lib/research';
import { ResearchIncidentSchema } from '@/lib/schemas';
import { getAuthenticatedUser, isOfficerOrAdmin } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/incidents/[id]/research
 * Retrieves the latest cached research for an incident
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return fail('Incident ID required', 400, 'VALIDATION');
  }

  const incidentData = await getIncident(id);
  if (!incidentData) {
    return fail('Incident not found', 404, 'NOT_FOUND');
  }

  const latestResearch = await getLatestResearch(id);
  if (!latestResearch) {
    return fail('No research records found for this incident', 404, 'NOT_FOUND');
  }

  return ok(latestResearch);
}

/**
 * POST /api/incidents/[id]/research
 * Triggers web research via Tavily and grounded synthesis via OpenRouter
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return fail('Incident ID required', 400, 'VALIDATION');
  }

  // Authorization check: Officer or Admin required
  const user = await getAuthenticatedUser(req);
  if (user && !isOfficerOrAdmin(user.role)) {
    return fail('Forbidden: Only pollution control officers can execute case web research', 403, 'FORBIDDEN');
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    body = {};
  }

  const parsed = ResearchIncidentSchema.safeParse(body);
  const forceRefresh = parsed.success ? parsed.data.forceRefresh : false;

  const incidentData = await getIncident(id);
  if (!incidentData) {
    return fail('Incident not found', 404, 'NOT_FOUND');
  }

  // Check if we have recent research and forceRefresh is false
  if (!forceRefresh) {
    const existingResearch = await getLatestResearch(id);
    if (existingResearch) {
      return ok(existingResearch, 'Retrieved cached incident research');
    }
  }

  const { incident, analysis } = incidentData;

  try {
    const researchResult = await performIncidentResearch(incident, analysis);
    const saved = await saveIncidentResearch(id, {
      ...researchResult,
      fingerprint: `${incident.pollutant}:${incident.locationName}:${incident.reportedValue ?? 'none'}`,
    });

    return ok(saved, 'Research completed successfully');
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.name === 'UNCONFIGURED_TAVILY' || error?.message?.includes('TAVILY_API_KEY')) {
      return fail(
        'TAVILY_API_KEY is not configured on the server. Please set TAVILY_API_KEY in .env.local to enable live web research.',
        503,
        'PROVIDER_UNCONFIGURED'
      );
    }

    return fail(
      error?.message || 'Failed to complete incident web research',
      500,
      'RESEARCH_ERROR'
    );
  }
}
