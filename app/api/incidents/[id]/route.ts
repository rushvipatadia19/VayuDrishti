import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/response';
import { updateIncidentStatus } from '@/lib/db';
import { PatchIncidentSchema } from '@/lib/schemas';
import { getAuthenticatedUser, isOfficerOrAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization check: Officer or Admin required
  const user = await getAuthenticatedUser(req);
  if (user && !isOfficerOrAdmin(user.role)) {
    return fail('Forbidden: Only authorized officers can change case status', 403, 'FORBIDDEN');
  }

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
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === 'NOT_FOUND' || error.name === 'NOT_FOUND') {
      return fail('Not found', 404, 'NOT_FOUND');
    }
    if (error.message === 'BAD_TRANSITION' || error.name === 'BAD_TRANSITION') {
      return fail('Invalid status transition', 409, 'BAD_TRANSITION');
    }
    return fail('Failed to update incident', 500, 'INTERNAL');
  }
}
