import { z } from 'zod';
import type { Place } from '../data/types';

export const conditionsSchema = z.object({
  minutes: z.union([z.literal(60), z.literal(120), z.literal(240)]),
  theme: z.string().min(1).nullable(),
  companion: z.enum(['solo', 'couple', 'friends', 'kids']),
  startId: z.string().min(1).nullable(),
}).strict();
export const recommendationSchema = z.object({
  placeIds: z.array(z.string().min(1)).min(3).max(7),
  reason: z.string().min(1).max(1000).refine(value => value.trim().length > 0),
}).strict();
export const responseSchema = recommendationSchema.extend({ source: z.enum(['ai', 'rule']) });
export type Conditions = z.infer<typeof conditionsSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationResponse = z.infer<typeof responseSchema>;
export type Candidate = Place & { recommendThemes: string[] };

export function estimatedMinutes(places: readonly Pick<Place, 'recommendedDurationMinutes'>[]): number {
  return places.reduce((sum, place) => sum + (place.recommendedDurationMinutes ?? 30), 0)
    + Math.max(0, places.length - 1) * 10;
}
