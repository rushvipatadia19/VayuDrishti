import { ok, fail } from '@/lib/response';
import { getIncident, updateIncidentStatus } from '@/lib/db';
import { PatchIncidentSchema } from '@/lib/schemas';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getIncident(id);
  if (!result) {
    return fail('Not found', 404, 'NOT_FOUND');
  }
  return ok(result);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const parsed = PatchIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  try {
    const updated = await updateIncidentStatus(id, parsed.data.status, parsed.data.reason);
    return ok(updated);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'BAD_TRANSITION' || err.name === 'BAD_TRANSITION') {
      return fail('That status change is not allowed from the current status.', 409, 'BAD_TRANSITION');
    }
    if (err.message === 'NOT_FOUND' || err.name === 'NOT_FOUND') {
      return fail('Not found', 404, 'NOT_FOUND');
    }
    return fail('Could not update status', 500, 'INTERNAL');
  }
}

