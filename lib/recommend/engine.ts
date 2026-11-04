import type { LngLat } from '../geo';
import { recommendByRule } from './rule';
import { validateRecommendation } from './validate';
import type { Candidate, Conditions, RecommendationResponse } from './types';

type Options = {
  ask: (places: readonly Candidate[], conditions: Conditions) => Promise<unknown>;
  now?: () => number;
  timeoutMs?: number;
};

// In-process limits: bounded cache and one shared 20-request/minute budget.
export function createRecommender({ ask, now = Date.now, timeoutMs = 8000 }: Options) {
  const cache = new Map<string, { expires: number; result: RecommendationResponse }>();
  const pending = new Map<string, Promise<RecommendationResponse | null>>();
  let windowStart = now();
  let requests = 0;
  return async (candidates: readonly Candidate[], conditions: Conditions, center: LngLat): Promise<RecommendationResponse | null> => {
    const timestamp = now();
    if (timestamp - windowStart >= 60000) { windowStart = timestamp; requests = 0; }
    requests = Math.min(requests + 1, 21);
    for (const [key, value] of cache) if (value.expires <= timestamp) cache.delete(key);
    const fallback = () => {
      const result = recommendByRule(candidates, conditions, center);
      return result ? { ...result, source: 'rule' as const } : null;
    };
    if (requests > 20) return fallback();
    const key = JSON.stringify([conditions, center, candidates]);
    const cached = cache.get(key);
    if (cached) return structuredClone(cached.result);
    const existing = pending.get(key);
    if (existing) return structuredClone(await existing);
    const work = (async () => {
      // If even the three cheapest stops cannot fit, no model can satisfy it.
      const durations = candidates.filter(place => place.id !== conditions.startId)
        .map(place => place.recommendedDurationMinutes ?? 30).sort((a, b) => a - b);
      const start = conditions.startId ? candidates.find(place => place.id === conditions.startId) : undefined;
      const minimum = (start ? start.recommendedDurationMinutes ?? 30 : 0)
        + durations.slice(0, start ? 2 : 3).reduce((sum, minutes) => sum + minutes, 0) + 20;
      if (candidates.length < 3 || minimum > conditions.minutes) return null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let result: RecommendationResponse | null;
      try {
        const raw = await Promise.race([
          Promise.resolve().then(() => ask(candidates, conditions)).catch(() => null),
          new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
        ]);
        const valid = validateRecommendation(raw, candidates, conditions);
        result = valid ? { ...valid, source: 'ai' } : fallback();
      } finally { clearTimeout(timer); }
      if (result) {
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(key, { expires: now() + 3600000, result: structuredClone(result) });
      }
      return result;
    })();
    pending.set(key, work);
    try { return structuredClone(await work); } finally { pending.delete(key); }
  };
}
