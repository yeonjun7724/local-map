import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recommendByRule } from '../../lib/recommend/rule';
import { parseRecommendationResponse, recommendationInputSchema, validateRecommendation } from '../../lib/recommend/schema';
import type { Place } from '../../lib/data/types';

const places = Array.from({ length: 8 }, (_, index) => ({
  id: `place-${index + 1}`, nameKo: `장소 ${index + 1}`, nameEn: `Place ${index + 1}`,
  latitude: 37.65 + index * 0.001, longitude: 126.76 + index * 0.001,
  coordinateStatus: 'verified', category: 'garden', theme: 'nature-rest',
  descriptionKo: '', descriptionEn: '', address: '', imageUrl: '', source: 'test', license: '',
  openingHours: '', tags: '', externalUrl: '', recommendedDurationMinutes: 10,
  updatedAt: '', isSample: false,
}) as Place);
const ids = places.map(place => place.id);
const valid = { placeIds: ids.slice(0, 3), reason: '편안한 산책 코스입니다.' };
const input = recommendationInputSchema.parse({ minutes: 60, theme: null, companion: 'kids', startId: null });

test('recommendation validation rejects an id outside the candidate set', () => {
  assert.equal(validateRecommendation({ ...valid, placeIds: ['missing', ...ids.slice(1, 3)] }, ids), null);
});

test('recommendation validation rejects 8 or 2 stops', () => {
  assert.equal(validateRecommendation({ ...valid, placeIds: ids }, ids), null);
  assert.equal(validateRecommendation({ ...valid, placeIds: ids.slice(0, 2) }, ids), null);
});

test('recommendation validation rejects duplicate ids and malformed JSON', () => {
  assert.equal(validateRecommendation({ ...valid, placeIds: [ids[0], ids[0], ids[1]] }, ids), null);
  assert.equal(parseRecommendationResponse('{bad json', ids), null);
});

test('rule route stays inside its time budget and contains 3 to 7 unique stops', () => {
  const route = recommendByRule(places, input, [126.7689, 37.6553]);
  assert.ok(route.elapsedMinutes <= input.minutes);
  assert.ok(route.placeIds.length >= 3 && route.placeIds.length <= 7);
  assert.equal(new Set(route.placeIds).size, route.placeIds.length);
});

test('rule route filters by theme and begins at the selected place', () => {
  const route = recommendByRule(places, { ...input, theme: 'nature-rest', startId: ids[5] }, [126.7689, 37.6553]);
  assert.equal(route.placeIds[0], ids[5]);
  assert.ok(route.placeIds.every(id => places.find(place => place.id === id)?.theme === 'nature-rest'));
});
