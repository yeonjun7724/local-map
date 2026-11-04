import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildStraightRoute } from '../../lib/data/route';

const a = { id: 'a', longitude: 126.76, latitude: 37.65 };
const b = { id: 'b', longitude: 126.77, latitude: 37.66 };
const c = { id: 'c', longitude: 126.78, latitude: 37.67 };

test('connects visits in order using longitude-latitude coordinate pairs', () => {
  const result = buildStraightRoute(['a', 'b', 'c'], [c, a, b]);
  assert.deepEqual(result.geojson.features.map(feature => feature.geometry.coordinates), [
    [[126.76, 37.65], [126.77, 37.66]],
    [[126.77, 37.66], [126.78, 37.67]],
  ]);
  assert.deepEqual(result.geojson.features.map(feature => feature.properties?.fromStep), [1, 2]);
});
test('preserves a closing return leg to the starting point', () => {
  const result = buildStraightRoute(['a', 'b', 'a'], [a, b]);
  assert.equal(result.geojson.features.length, 2);
  assert.deepEqual(result.geojson.features[1].geometry.coordinates, [[126.77, 37.66], [126.76, 37.65]]);
});
test('missing or filtered stops break adjacent legs rather than creating shortcuts', () => {
  for (const places of [[a, c], [a, { ...b, longitude: null, latitude: null }, c]]) {
    const result = buildStraightRoute(['a', 'b', 'c'], places);
    assert.equal(result.geojson.features.length, 0);
    assert.equal(result.missingLegs, 2);
  }
});
test('coincident locations create no invented line or shifted coordinate', () => {
  const result = buildStraightRoute(['a', 'b', 'a'], [a, { ...a, id: 'b' }]);
  assert.equal(result.geojson.features.length, 0);
  assert.equal(result.coincidentLegs, 2);
});
test('empty or single-stop itineraries have no segments', () => {
  for (const ids of [[], ['a']]) assert.deepEqual(buildStraightRoute(ids, [a]).geojson.features, []);
});
test('does not mutate itinerary or source records', () => {
  const ids = Object.freeze(['a', 'b', 'c']);
  const places = Object.freeze([Object.freeze(a), Object.freeze(b), Object.freeze(c)]);
  const before = structuredClone({ ids, places });
  buildStraightRoute(ids, places);
  assert.deepEqual({ ids, places }, before);
});
