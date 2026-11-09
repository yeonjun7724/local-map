import { loadAtlasData } from '@/lib/data/load';
import { siteConfig } from '@/config/site';
import { askModel } from '@/lib/recommend/openai';
import { recommendByRule } from '@/lib/recommend/rule';
import { recommendationInputSchema } from '@/lib/recommend/schema';

export const runtime = 'nodejs';

const cache = new Map<string, { expiresAt: number; value: { placeIds: string[]; reason: string; source: 'ai' | 'rule' } }>();
const rateLimits = new Map<string, number[]>();
const CACHE_MS = 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = recommendationInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid recommendation conditions' }, { status: 400 });

  const input = parsed.data;
  const data = await loadAtlasData();
  if (input.theme && !data.themes.some(theme => theme.id === input.theme)) return Response.json({ error: 'Unknown theme' }, { status: 400 });
  if (input.startId && !data.places.some(place => place.id === input.startId)) return Response.json({ error: 'Unknown start place' }, { status: 400 });

  const now = Date.now();
  const key = JSON.stringify(input);
  for (const [cacheKey, entry] of cache) if (entry.expiresAt <= now) cache.delete(cacheKey);
  const cached = cache.get(key);
  if (cached) return Response.json(cached.value);

  const orderedCandidates = input.theme
    ? [...data.places.filter(place => place.theme === input.theme), ...data.places.filter(place => place.theme !== input.theme)]
    : data.places;
  const candidates = orderedCandidates.slice(0, 30);
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const recent = (rateLimits.get(address) ?? []).filter(time => now - time < RATE_WINDOW_MS);
  const overLimit = recent.length >= MAX_REQUESTS;
  if (!overLimit) { recent.push(now); rateLimits.set(address, recent); }

  const aiResult = overLimit ? null : await askModel(candidates, data.themes, input);
  const fallback = recommendByRule(candidates, input, siteConfig.region.center);
  const rulePlaces = new Map(candidates.map(place => [place.id, place]));
  const result = aiResult
    ? { ...aiResult, source: 'ai' as const }
    : { placeIds: fallback.placeIds, reason: fallback.placeIds.map(id => rulePlaces.get(id)?.nameKo).filter(Boolean).join(' → ') || '조건에 맞는 장소를 찾지 못했습니다.', source: 'rule' as const };
  cache.set(key, { expiresAt: now + CACHE_MS, value: result });
  return Response.json(result);
}
