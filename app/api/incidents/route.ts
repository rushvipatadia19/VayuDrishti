import { ok, fail } from '@/lib/response';
import { listIncidents, createIncident, getStation } from '@/lib/db';
import { CreateIncidentSchema } from '@/lib/schemas';
import { getAuthenticatedUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Public listing of incidents for community visibility
  const incidents = await listIncidents();
  return ok(incidents);
}

export async function POST(req: NextRequest) {
  // Optional auth: Residents, Officers, or Guests in demo mode can submit incidents
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const station = await getStation(parsed.data.stationId);
  if (!station) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  const incident = await createIncident(parsed.data);
  return ok(incident, 'Created', 201);
}
