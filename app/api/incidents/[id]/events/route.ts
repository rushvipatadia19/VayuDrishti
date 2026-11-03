import { ok, fail } from '@/lib/response';
import { getIncident, createEvent } from '@/lib/db';
import { AddEventSchema } from '@/lib/schemas';

export async function POST(
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

  const parsed = AddEventSchema.safeParse(body);
  if (!parsed.success) {
    return fail('Invalid input', 400, 'VALIDATION');
  }

  const existing = await getIncident(id);
  if (!existing) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  if (existing.incident.status === 'closed') {
    return fail('That status change is not allowed from the current status.', 409, 'BAD_TRANSITION');
  }

  const event = await createEvent(id, {
    kind: 'action',
    text: parsed.data.text,
    imageUrl: parsed.data.imageUrl ?? null,
  });

  if (event === 'CLOSED') {
    return fail('That status change is not allowed from the current status.', 409, 'BAD_TRANSITION');
  }

  if (!event) {
    return fail('Not found', 404, 'NOT_FOUND');
  }

  return ok(event, undefined, 201);
}

