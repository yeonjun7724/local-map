import type { Place } from '../data/types';
import { estimatedMinutes, recommendationSchema, type Conditions, type Recommendation } from './types';

export function parseModelText(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// Reject the whole response. Never remove, replace, reorder, or repair model IDs.
export function validateRecommendation(value: unknown, candidates: readonly Place[], conditions?: Conditions): Recommendation | null {
  const parsed = recommendationSchema.safeParse(value);
  if (!parsed.success) return null;
  const result = parsed.data;
  if (new Set(result.placeIds).size !== result.placeIds.length) return null;
  const byId = new Map(candidates.map(place => [place.id, place]));
  if (result.placeIds.some(id => !byId.has(id))) return null;
  if (conditions) {
    if (conditions.startId && result.placeIds[0] !== conditions.startId) return null;
    if (estimatedMinutes(result.placeIds.map(id => byId.get(id)!)) > conditions.minutes) return null;
  }
  return result;
}
