import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { parseAtlasData } from '../../lib/data/parse';
import { parseRoutePaths, buildNetworkRoute, type RoutePaths } from '../../lib/data/paths';
import { assembleWalkingRoute, walkingRequestSchema } from '../../lib/data/walking';
import RoutePanel from '../../components/RoutePanel';
import { getMessages } from '../../lib/i18n';

const read = (name: string) => readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8');
const data = parseAtlasData(read('places.csv'), read('routes.json'), read('categories.json'));
const pairs: RoutePaths = JSON.parse(read('walking-paths.json'));
const ids = data.routes[0].placeIds;
const noop = () => {};

test('OSMnx pair dataset covers every located ordered pair and validates against current coordinates', () => {
  const located = data.places.filter(place => place.longitude !== null && place.latitude !== null);
  const routes = located.flatMap(a => located.filter(b => b.id !== a.id).map(b => ({ routeId: JSON.stringify([a.id, b.id]), placeIds: [a.id, b.id] })));
  assert.equal(Object.keys(pairs.routes).length, located.length * (located.length - 1));
  parseRoutePaths(JSON.stringify(pairs), routes, data.places);
});
test('recommended route uses actual pair geometry in exact stop order and sums all leg times', () => {
  const result = assembleWalkingRoute(pairs, ids, data.places);
  const path = result.routes['my-route'];
  assert.equal(path.status, 'ready');
  assert.deepEqual(path.placeIds, ids);
  assert.equal(path.totalDurationS, path.segments.reduce((sum, leg) => sum + leg.durationS!, 0));
  assert.equal(Object.keys(result.routes).length, 1);
  for (let index = 0; index < ids.length - 1; index++) assert.deepEqual(path.segments[index], pairs.routes[JSON.stringify([ids[index], ids[index + 1]])].segments[0]);
  assert.ok(path.geometry.length > ids.length);
  assert.equal(buildNetworkRoute(path, data.places).geojson.features.length, ids.length - 1);
});
test('reverse stop order loads independently computed reverse paths', () => {
  const reverse = [...ids].reverse();
  const path = assembleWalkingRoute(pairs, reverse, data.places).routes['my-route'];
  assert.deepEqual(path.placeIds, reverse);
  assert.deepEqual(path.segments[0], pairs.routes[JSON.stringify(reverse.slice(0, 2))].segments[0]);
});
test('coincident places stay unavailable without a fabricated line or zero-time total', () => {
  const stops = ['ilsan-lake-park', 'cactus-botanical', 'goyang-flower-center'];
  const path = assembleWalkingRoute(pairs, stops, data.places).routes['my-route'];
  assert.equal(path.status, 'unavailable');
  assert.equal(path.totalDurationS, null);
  assert.equal(buildNetworkRoute(path, data.places).geojson.features.length, 0);
  assert.ok(path.segments.every(leg => leg.reason === 'coincident_coordinates'));
});
test('partial recommendations show only available legs and hide incomplete totals', () => {
  const stops = ['lake-waterfall', 'ilsan-lake-park', 'cactus-botanical'];
  const path = assembleWalkingRoute(pairs, stops, data.places).routes['my-route'];
  assert.equal(path.status, 'partial');
  assert.equal(path.totalDistanceM, null);
  assert.equal(path.totalDurationS, null);
  assert.equal(buildNetworkRoute(path, data.places).geojson.features.length, 1);
});
test('filtering a recommendation never draws shortcuts across hidden stops', () => {
  const path = assembleWalkingRoute(pairs, ids, data.places).routes['my-route'];
  const visible = data.places.filter(place => place.id !== ids[1]);
  const line = buildNetworkRoute(path, visible);
  assert.equal(line.filtered, true);
  assert.equal(line.geojson.features.length, 1);
  assert.equal(line.geojson.features[0].properties!.fromId, ids[2]);
});
test('stale coordinates, missing pair data and tampered metrics fail closed', () => {
  assert.throws(() => assembleWalkingRoute(pairs, ids, data.places.map(place => place.id === ids[0] ? { ...place, longitude: place.longitude! + 0.01 } : place)));
  for (const change of [
    (copy: RoutePaths) => { delete copy.routes[JSON.stringify(ids.slice(0, 2))]; },
    (copy: RoutePaths) => { copy.routes[JSON.stringify(ids.slice(0, 2))].segments[0].durationS = 999999; },
  ]) { const copy = structuredClone(pairs); change(copy); assert.throws(() => assembleWalkingRoute(copy, ids, data.places)); }
});
test('stop input rejects unknown, missing coordinates, duplicates and too many or too few stops', () => {
  for (const placeIds of [[], ids.slice(0, 2), [...ids, ...ids], [ids[0], ids[0], ids[1]]]) assert.equal(walkingRequestSchema.safeParse({ placeIds }).success, false);
  assert.throws(() => assembleWalkingRoute(pairs, [ids[0], ids[1], 'unknown'], data.places));
  const missing = data.places.find(place => place.longitude === null)!;
  assert.throws(() => assembleWalkingRoute(pairs, [ids[0], ids[1], missing.id], data.places));
});
test('recommended panel shows network provenance, actual times and bilingual notice', () => {
  const paths = assembleWalkingRoute(pairs, ids, data.places);
  for (const locale of ['ko', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(RoutePanel, { route: { ...data.routes[0], routeId: 'my-route' }, places: data.places, locale,
      onLocaleChange: noop, onSelectPlace: noop, onClear: noop, path: paths.routes['my-route'], pathsMeta: paths, custom: true, networkState: 'ready' }));
    assert.ok(html.includes(getMessages(locale).route.networkNotice));
    assert.ok(html.includes('ODbL 1.0'));
    assert.ok(html.includes('route-total-duration'));
  }
});
test('recommended panel distinguishes pending and failed path requests with retry', () => {
  for (const networkState of ['loading', 'error'] as const) {
    const html = renderToStaticMarkup(createElement(RoutePanel, { route: data.routes[0], places: data.places, locale: 'ko',
      onLocaleChange: noop, onSelectPlace: noop, onClear: noop, custom: true, networkState, onRetry: noop }));
    assert.ok(html.includes(networkState === 'loading' ? getMessages('ko').route.networkLoading : getMessages('ko').route.networkFailed));
    assert.equal(html.includes('retry-route'), networkState === 'error');
  }
});
