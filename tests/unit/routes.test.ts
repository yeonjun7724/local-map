import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAtlasData } from '../../lib/data/parse';
import { visiblePlaces } from '../../lib/data/presentation';

const read = (name: string) => readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8');
const csv = read('places.csv');
const routeJson = read('routes.json');
const categories = read('categories.json');
const expected = [
  ['lake-scenery-walk', ['ilsan-lake-park', 'lake-waterfall', 'aesugyo', 'wolpajeong']],
  ['plants-exhibition-walk', ['ilsan-lake-park', 'cactus-botanical', 'goyang-flower-center', 'ilsan-lake-park']],
  ['park-snack-city-walk', ['ilsan-lake-park', 'ilsan-cultural-square', 'lafesta', 'cafe-doha']],
];

test('exactly three requested routes preserve every supplied visit in order', () => {
  const data = parseAtlasData(csv, routeJson, categories);
  assert.equal(data.routes.length, 3);
  assert.deepEqual(data.routes.map(route => [route.routeId, route.placeIds]), expected);
  assert.ok(data.routes.every(route => route.transportMode === 'walking'));
  assert.ok(!data.routes.some(route => route.routeId === 'temp-route'));
  assert.ok(data.routes.every(route => /기획 목표·실측 보행시간 아님/.test(route.descriptionKo)));
});

test('approved round trip keeps four visits with only three unique cards and pins', () => {
  const data = parseAtlasData(csv, routeJson, categories);
  const route = data.routes[1];
  assert.equal(route.placeIds.length, 4);
  assert.equal(route.placeIds[0], route.placeIds.at(-1));
  assert.deepEqual(visiblePlaces(data, route.routeId).map(place => place.id), route.placeIds.slice(0, -1));
  assert.deepEqual(visiblePlaces(data, route.routeId)[0].visitNumbers, [1, 4]);
});

test('interior duplicates remain invalid even when endpoints match', () => {
  const route = JSON.parse(routeJson)[1];
  for (const placeIds of [
    ['ilsan-lake-park', 'cactus-botanical', 'cactus-botanical', 'ilsan-lake-park'],
    ['ilsan-lake-park', 'cactus-botanical', 'ilsan-lake-park', 'goyang-flower-center'],
  ]) assert.throws(() => parseAtlasData(csv, JSON.stringify([{ ...route, placeIds }]), categories), /중복 ID/);
});

test('unknown places, unregistered themes, invalid route IDs and other transport modes are rejected', () => {
  const route = JSON.parse(routeJson)[0];
  for (const change of [
    { placeIds: ['missing-place'] }, { theme: 'unknown-theme' },
    { routeId: 'Upper_Case' }, { routeId: 'route-123' }, { transportMode: 'driving' },
  ]) assert.throws(() => parseAtlasData(csv, JSON.stringify([{ ...route, ...change }]), categories));
});

test('English descriptions use the exact CSV proper names', () => {
  const data = parseAtlasData(csv, routeJson, categories);
  for (const route of data.routes) {
    for (const placeId of new Set(route.placeIds)) {
      const place = data.places.find(place => place.id === placeId)!;
      assert.ok(route.descriptionEn.includes(place.nameEn), `${route.routeId}: ${place.nameEn}`);
    }
  }
});
