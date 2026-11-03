import { ok, fail } from '@/lib/response';
import { getReadings, getStation } from '@/lib/db';
import { ReadingsQuerySchema } from '@/lib/schemas';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const url = new URL(req.url);
  const queryObj = {
    pollutant: url.searchParams.get('pollutant') ?? undefined,
    days: url.searchParams.get('days') ?? undefined,
  };

  const parsed = ReadingsQuerySchema.safeParse(queryObj);
  if (!parsed.success) {
    return fail('Invalid query', 400, 'VALIDATION');
  }

  const station = await getStation(id);
  if (!station) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  const readings = await getReadings(id, parsed.data.pollutant, parsed.data.days);
  return ok(readings);
}

