import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/response';
import { createEvent } from '@/lib/db';
import { AddEventSchema } from '@/lib/schemas';
import { getAuthenticatedUser, isOfficerOrAdmin } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authorization check: Officer or Admin required
  const user = await getAuthenticatedUser(req);
  if (user && !isOfficerOrAdmin(user.role)) {
    return fail('Forbidden: Only authorized officers can log corrective actions', 403, 'FORBIDDEN');
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const parsed = AddEventSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const res = await createEvent(id, {
    kind: 'action',
    text: parsed.data.text,
    imageUrl: parsed.data.imageUrl ?? null,
  });

  if (res === null) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  if (res === 'CLOSED') {
    return fail('Case is closed', 409, 'BAD_TRANSITION');
  }

  return ok(res, 'Created', 201);
}
