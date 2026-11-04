import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAtlasData } from '../../lib/data/parse';
import { nearestNeighborOrder } from '../../lib/geo';
import { makeCandidates } from '../../lib/recommend/candidates';
import { createRecommender } from '../../lib/recommend/engine';
import { recommendByRule } from '../../lib/recommend/rule';
import { conditionsSchema, estimatedMinutes, type Conditions } from '../../lib/recommend/types';
import { parseModelText, validateRecommendation } from '../../lib/recommend/validate';
import { visiblePlaces } from '../../lib/data/presentation';

const read = (file: string) => readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8');
const data = parseAtlasData(read('places.csv'), read('routes.json'), read('categories.json'));
const center = [126.76890828, 37.65528473] as const;
const conditions: Conditions = { minutes: 120, theme: null, companion: 'kids', startId: null };
const candidates = makeCandidates(data, conditions, center);
const valid = { placeIds: candidates.slice(0, 3).map(place => place.id), reason: '후보 목록으로 구성한 코스입니다.' };

test('validator accepts only candidate IDs and preserves the response unchanged', () => {
  assert.deepEqual(validateRecommendation(valid, candidates, conditions), valid);
});
for (const [name, ids] of [
  ['unknown ID', [valid.placeIds[0], valid.placeIds[1], 'nonexistent-id']],
  ['eight places', candidates.slice(0, 8).map(place => place.id)],
  ['two places', valid.placeIds.slice(0, 2)],
  ['duplicate ID', [valid.placeIds[0], valid.placeIds[0], valid.placeIds[1]]],
] as const) test(`validator rejects ${name} without repair`, () => {
  assert.equal(validateRecommendation({ placeIds: ids, reason: valid.reason }, candidates), null);
});
test('malformed JSON and incorrect shapes are discarded', () => {
  for (const text of ['not JSON', '{"placeIds": [}', '', '{bad}']) assert.equal(parseModelText(text), null);
  assert.equal(validateRecommendation({ placeIds: valid.placeIds }, candidates), null);
  assert.equal(validateRecommendation({ ...valid, reason: '  ' }, candidates), null);
  assert.deepEqual(parseModelText(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``), valid);
});
test('AI responses exceeding the time budget or ignoring the selected start are rejected', () => {
  assert.equal(validateRecommendation(valid, candidates, { ...conditions, minutes: 60 }), null);
  assert.equal(validateRecommendation(valid, candidates, { ...conditions, startId: valid.placeIds[1] }), null);
});
test('input accepts only enumerated conditions and rejects client candidate lists', () => {
  assert.equal(conditionsSchema.safeParse({ ...conditions, minutes: 90 }).success, false);
  assert.equal(conditionsSchema.safeParse({ ...conditions, companion: 'other' }).success, false);
  assert.equal(conditionsSchema.safeParse({ ...conditions, candidates: [] }).success, false);
});
test('rule returns 3–7 unique stops within budget, using 30-minute defaults and 10-minute legs', () => {
  for (const minutes of [120, 240] as const) {
    const result = recommendByRule(candidates, { ...conditions, minutes }, center)!;
    assert.ok(result.placeIds.length >= 3 && result.placeIds.length <= 7);
    assert.equal(new Set(result.placeIds).size, result.placeIds.length);
    const selected = result.placeIds.map(id => candidates.find(place => place.id === id)!);
    assert.ok(estimatedMinutes(selected) <= minutes);
    assert.equal(result.placeIds.length, minutes === 120 ? 3 : 6);
  }
});
test('impossible 60-minute conditions return no course rather than shorten visits', () => {
  assert.equal(recommendByRule(candidates, { ...conditions, minutes: 60 }, center), null);
});
test('explicit shorter visit times allow a 60-minute course, still bounded to 3–7', () => {
  const short = candidates.map(place => ({ ...place, recommendedDurationMinutes: 5 }));
  const result = recommendByRule(short, { ...conditions, minutes: 60 }, center)!;
  assert.ok(result.placeIds.length >= 3 && result.placeIds.length <= 7);
  assert.ok(estimatedMinutes(result.placeIds.map(id => short.find(place => place.id === id)!)) <= 60);
});
test('rule honors theme, explicit start, and nearest-neighbor order without mutating inputs', () => {
  const next: Conditions = { ...conditions, minutes: 240, theme: 'cafe-alley', startId: 'ddnb' };
  const pool = makeCandidates(data, next, center);
  const snapshot = structuredClone(pool);
  const result = recommendByRule(pool, next, center)!;
  assert.equal(result.placeIds[0], 'ddnb');
  assert.ok(result.placeIds.every(id => pool.find(place => place.id === id)!.recommendThemes.includes('cafe-alley')));
  assert.deepEqual(pool, snapshot);
  assert.deepEqual(nearestNeighborOrder(pool.filter(place => place.recommendThemes.includes('cafe-alley')), 'ddnb', center)
    .slice(0, result.placeIds.length).map(place => place.id), result.placeIds);
});
test('candidate selection is capped at 30, prioritizes requested theme and includes route themes', () => {
  const next = { ...conditions, theme: 'lake-garden' };
  const pool = makeCandidates(data, next, center);
  assert.ok(pool.length <= 30);
  assert.ok(pool[0].recommendThemes.includes('lake-garden'));
  assert.ok(pool.find(place => place.id === 'ilsan-lake-park')!.recommendThemes.includes('lake-garden'));
  assert.ok(pool.every(place => place.longitude !== null && place.latitude !== null));
});
test('custom map uses the same ordered IDs as recommendation, with numbered pins', () => {
  const mapped = visiblePlaces(data, 'my-route', valid.placeIds);
  assert.deepEqual(mapped.map(place => place.id), valid.placeIds);
  assert.deepEqual(mapped.map(place => place.visitNumbers), [[1], [2], [3]]);
});
test('engine caches the same conditions for one hour and refreshes after expiry', async () => {
  let calls = 0; let now = 0;
  const recommend = createRecommender({ now: () => now, ask: async () => { calls++; return valid; } });
  const first = await recommend(candidates, conditions, center);
  assert.equal(first?.source, 'ai');
  first!.placeIds.reverse(); // callers cannot mutate the cache
  assert.deepEqual((await recommend(candidates, conditions, center))?.placeIds, valid.placeIds);
  assert.equal(calls, 1);
  now = 3600001;
  await recommend(candidates, conditions, center);
  assert.equal(calls, 2);
});
test('engine falls back for unavailable model, thrown provider error, or invalid response', async () => {
  for (const ask of [async () => null, async () => { throw new Error('provider failure'); }, async () => ({ ...valid, placeIds: ['missing'] })]) {
    assert.equal((await createRecommender({ ask })(candidates, conditions, center))?.source, 'rule');
  }
});
test('engine falls back after its deadline without waiting indefinitely', async () => {
  const recommend = createRecommender({ timeoutMs: 5, ask: () => new Promise(() => {}) });
  assert.equal((await recommend(candidates, conditions, center))?.source, 'rule');
});
test('twenty-per-minute budget falls back even on cache hits; next window resets', async () => {
  let now = 0; let calls = 0;
  const recommend = createRecommender({ now: () => now, ask: async () => { calls++; return valid; } });
  for (let i = 0; i < 20; i++) assert.equal((await recommend(candidates, conditions, center))?.source, 'ai');
  assert.equal((await recommend(candidates, conditions, center))?.source, 'rule');
  assert.equal(calls, 1);
  now = 60001;
  assert.equal((await recommend(candidates, conditions, center))?.source, 'ai');
});
test('concurrent identical requests share one model call', async () => {
  let calls = 0;
  const recommend = createRecommender({ ask: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return valid; } });
  const results = await Promise.all(Array.from({ length: 5 }, () => recommend(candidates, conditions, center)));
  assert.equal(calls, 1);
  assert.ok(results.every(result => result?.source === 'ai'));
});
test('impossible conditions do not invoke the model', async () => {
  let calls = 0;
  const recommend = createRecommender({ ask: async () => { calls++; return valid; } });
  assert.equal(await recommend(candidates, { ...conditions, minutes: 60 }, center), null);
  assert.equal(calls, 0);
});
