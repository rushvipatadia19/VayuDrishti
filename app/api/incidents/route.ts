import { ok, fail } from '@/lib/response';
import { listIncidents, createIncident, getStation } from '@/lib/db';
import { CreateIncidentSchema } from '@/lib/schemas';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const incidents = await listIncidents();
  return ok(incidents);
}

export async function POST(req: NextRequest) {
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
