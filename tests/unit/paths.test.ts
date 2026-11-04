import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAtlasData } from '../../lib/data/parse';
import { buildNetworkRoute, parseRoutePaths } from '../../lib/data/paths';

const read = (name: string) => readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8');
const data = parseAtlasData(read('places.csv'), read('routes.json'), read('categories.json'));
const text = read('route-paths.json');
const parse = (value: unknown) => parseRoutePaths(JSON.stringify(value), data.routes, data.places);

test('generated paths validate against the exact route order and source coordinates', () => {
  const paths = parseRoutePaths(text, data.routes, data.places);
  assert.equal(paths.networkType, 'walk');
  assert.equal(paths.walkingSpeedKmh, 4.5);
  assert.deepEqual(Object.keys(paths.routes), data.routes.map(route => route.routeId));
  const first = paths.routes[data.routes[0].routeId];
  assert.equal(first.status, 'ready');
  assert.ok(first.geometry.length > data.routes[0].placeIds.length);
});
test('unavailable and partial routes retain failures instead of fabricated zero distances', () => {
  const paths = parseRoutePaths(text, data.routes, data.places);
  for (const route of data.routes.slice(1)) {
    const path = paths.routes[route.routeId];
    assert.equal(path.totalDistanceM, null);
    assert.equal(path.totalDurationS, null);
    assert.deepEqual(path.geometry, []);
    assert.ok(path.segments.some(segment => segment.reason === 'coincident_coordinates'));
  }
});
test('rendered lines use stored OSM geometry and filters never bridge hidden stops', () => {
  const paths = parseRoutePaths(text, data.routes, data.places);
  const path = paths.routes[data.routes[0].routeId];
  const full = buildNetworkRoute(path, data.places);
  assert.deepEqual(full.geojson.features[0].geometry.coordinates, path.segments[0].geometry);
  const hidden = data.places.filter(place => place.id !== path.placeIds[1]);
  const filtered = buildNetworkRoute(path, hidden);
  assert.equal(filtered.filtered, true);
  assert.equal(filtered.geojson.features.length, 1);
  assert.equal(filtered.geojson.features[0].properties?.fromId, path.placeIds[2]);
});
test('changed route order or CSV coordinates are rejected as stale data', () => {
  const value = JSON.parse(text);
  value.routes[data.routes[0].routeId].placeIds.reverse();
  assert.throws(() => parse(value), /방문 순서 또는 좌표/);
  const places = data.places.map(place => place.id === 'ilsan-lake-park' ? { ...place, longitude: place.longitude! + 0.001 } : place);
  assert.throws(() => parseRoutePaths(text, data.routes, places), /방문 순서 또는 좌표/);
});
test('invalid coordinates, totals, status or failed-segment geometry are rejected', () => {
  for (const mutate of [
    (value: ReturnType<typeof JSON.parse>) => { value.routes[data.routes[0].routeId].segments[0].geometry[0][0] = 200; },
    (value: ReturnType<typeof JSON.parse>) => { value.routes[data.routes[0].routeId].totalDistanceM += 100; },
    (value: ReturnType<typeof JSON.parse>) => { value.walkingSpeedKmh = 20; },
    (value: ReturnType<typeof JSON.parse>) => { value.routes[data.routes[0].routeId].geometry[0] = [126, 37]; },
    (value: ReturnType<typeof JSON.parse>) => { value.routes[data.routes[1].routeId].status = 'ready'; },
    (value: ReturnType<typeof JSON.parse>) => { value.routes[data.routes[1].routeId].segments[0].geometry = [[126, 37], [127, 38]]; },
  ]) {
    const value = JSON.parse(text);
    mutate(value);
    assert.throws(() => parse(value));
  }
});
