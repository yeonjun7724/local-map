import { z } from 'zod';

export const recommendationSchema = z.object({
  placeIds: z.array(z.string()),
  reason: z.string().trim().min(1).max(500),
}).strict();

export const recommendationInputSchema = z.object({
  minutes: z.union([z.literal(60), z.literal(120), z.literal(240)]),
  theme: z.string().nullable(),
  companion: z.enum(['solo', 'couple', 'friends', 'kids']),
  startId: z.string().nullable(),
}).strict();

export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationInput = z.infer<typeof recommendationInputSchema>;

export function validateRecommendation(value: unknown, candidateIds: readonly string[]): Recommendation | null {
  const parsed = recommendationSchema.safeParse(value);
  if (!parsed.success) return null;
  const ids = parsed.data.placeIds;
  if (ids.length < 3 || ids.length > 7 || new Set(ids).size !== ids.length) return null;
  const validIds = new Set(candidateIds);
  return ids.every(id => validIds.has(id)) ? parsed.data : null;
}

export function parseRecommendationResponse(value: string, candidateIds: readonly string[]): Recommendation | null {
  try {
    return validateRecommendation(JSON.parse(value), candidateIds);
  } catch {
    return null;
  }
}
