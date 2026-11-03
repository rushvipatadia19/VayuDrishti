import { ok, fail } from '@/lib/response';
import { getStations } from '@/lib/db';

export async function GET() {
  try {
    const stations = await getStations();
    return ok(stations);
  } catch {
    return fail('Could not load stations', 500, 'INTERNAL');
  }
}

