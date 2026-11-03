import { z } from 'zod';

export const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  pollutant: z.enum(['PM2.5', 'PM10']),
  reportedValue: z.number().min(0).max(2000).nullable().optional(),
  stationId: z.string().min(1),
  locationName: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export const AnalyzeSchema = z.object({
  incidentId: z.string().min(1),
});

export const AddEventSchema = z.object({
  kind: z.literal('action'),
  text: z.string().min(1).max(500),
  imageUrl: z.string().url().nullable().optional(),
});

export const PatchIncidentSchema = z.object({
  status: z.enum(['open', 'under_review', 'action_taken', 'closed']),
  reason: z.string().max(200).optional(),
});

export const ReadingsQuerySchema = z.object({
  pollutant: z.enum(['PM2.5', 'PM10']).default('PM2.5'),
  days: z.coerce.number().int().min(1).max(90).default(30),
});
