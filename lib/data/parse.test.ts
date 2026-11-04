import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAtlasData, parsePlaces } from './parse';
import { groupMapPlaces, visiblePlaces } from './presentation';

const csv = readFileSync(new URL('../../data/places.csv', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../../data/routes.json', import.meta.url), 'utf8');
const categories = readFileSync(new URL('../../data/categories.json', import.meta.url), 'utf8');

function fixture(changes: Record<string, string> = {}) {
  const record = {
    id: 'test-place', nameKo: '장소', nameEn: '', latitude: '', longitude: '',
    category: 'nature', theme: '', descriptionKo: '쉼표, 따옴표 "포함"\n두 줄 설명', descriptionEn: '',
    address: '', imageUrl: '', source: '사용자 자료', license: '', openingHours: '', tags: '',
    externalUrl: '', recommendedDurationMinutes: '', updatedAt: '', isSample: 'FALSE',
    coordinateStatus: 'missing', ...changes,
  };
  const escape = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  return '\uFEFF' + Object.keys(record).join(',') + '\r\n' + Object.values(record).map(escape).join(',') + '\r\n';
}

test('real sources resolve every route and category without manufacturing coordinates', () => {
  const result = parseAtlasData(csv, routes, categories);
  assert.ok(result.routes.every(route => route.placeIds.every(placeId => result.places.some(place => place.id === placeId))));
  const missing = result.places.find(place => place.id === 'traditional-garden')!;
  assert.equal(missing.latitude, null);
  assert.equal(missing.longitude, null);
  assert.equal(result.places.find(place => place.id === 'aesugyo')!.coordinateStatus, 'approximate');
});

test('planning categories and themes coexist with all existing CSV IDs', () => {
  const data = parseAtlasData(csv, routes, categories);
  const categoryIds = new Set(data.categories.map(category => category.id));
  const themeIds = new Set(data.themes.map(theme => theme.id));
  for (const id of ['garden', 'forest-trail', 'waterfront', 'flower-garden', 'bridge-view',
    'plaza', 'nature-learning', 'plant-exhibition', 'outdoor-art', 'playground',
    'fountain-photo-spot', 'viewpoint', 'walking-trail']) assert.ok(categoryIds.has(id));
  for (const id of ['lake-garden', 'nature-play', 'family-walk']) assert.ok(themeIds.has(id));
  assert.ok(data.places.every(place => categoryIds.has(place.category) && (!place.theme || themeIds.has(place.theme))));
});

test('rejects unknown CSV themes and routes without a registered theme', () => {
  assert.throws(() => parseAtlasData(fixture({ theme: 'unknown' }), routes, categories), /미등록 theme/);
  const catalog = JSON.parse(categories.replace(/^\uFEFF/, ''));
  catalog.themes = catalog.themes.filter((theme: { id: string }) => theme.id !== 'lake-garden');
  assert.throws(() => parseAtlasData(csv, routes, JSON.stringify(catalog)), /미등록 theme/);
});

test('rejects invalid category colors, icon names and missing English names', () => {
  for (const changes of [{ color: '#abc' }, { icon: 'NotALucideIcon' }, { nameEn: '' }]) {
    const catalog = JSON.parse(categories.replace(/^\uFEFF/, ''));
    Object.assign(catalog.categories[0], changes);
    assert.throws(() => parseAtlasData(csv, routes, JSON.stringify(catalog)));
  }
});

test('rejects duplicate theme IDs', () => {
  const catalog = JSON.parse(categories.replace(/^\uFEFF/, ''));
  catalog.themes.push(catalog.themes[0]);
  assert.throws(() => parseAtlasData(csv, routes, JSON.stringify(catalog)), /중복 ID/);
});

test('default and all views include every CSV place, including places outside routes', () => {
  const data = parseAtlasData(csv, routes, categories);
  for (const view of ['', 'all', 'unknown']) {
    const visible = visiblePlaces(data, view);
    assert.deepEqual(visible.map(place => place.id), data.places.map(place => place.id));
    assert.ok(visible.some(place => place.id === 'lafesta'));
    assert.ok(visible.some(place => place.category === 'food'));
    assert.ok(visible.some(place => place.category === 'cafe'));
    assert.ok(visible.every(place => place.icon.length > 0));
  }
});

test('route views preserve first visit order and original place descriptions', () => {
  const data = parseAtlasData(csv, routes, categories);
  for (const route of data.routes) {
    const visible = visiblePlaces(data, route.routeId);
    assert.deepEqual(visible.map(place => place.id), [...new Set(route.placeIds)]);
    assert.ok(visible.every(place => place.descriptionKo === data.places.find(item => item.id === place.id)!.descriptionKo));
  }
});

test('same-coordinate groups retain every located place without changing coordinates', () => {
  const data = parseAtlasData(csv, routes, categories);
  const places = visiblePlaces(data, 'all');
  const before = structuredClone(places);
  const groups = groupMapPlaces(places);
  const located = places.filter(place => place.longitude !== null && place.latitude !== null);
  assert.deepEqual(groups.flat().map(place => place.id).sort(), located.map(place => place.id).sort());
  assert.ok(groups.some(group => group.length > 1));
  assert.ok(groups.every(group => group.every(place => place.longitude === group[0].longitude && place.latitude === group[0].latitude)));
  assert.deepEqual(places, before);
});

test('handles BOM, quoted commas, escaped quotes, and multiline CSV', () => {
  const [place] = parsePlaces(fixture());
  assert.equal(place.descriptionKo, '쉼표, 따옴표 "포함"\n두 줄 설명');
  assert.equal(place.isSample, false);
});

test('rejects a missing required header even without records', () => {
  assert.throws(() => parsePlaces('id,nameKo\n'), /헤더/);
});

test('rejects malformed CSV, duplicate headers and duplicate IDs', () => {
  assert.throws(() => parsePlaces(fixture().replace('"사용자 자료"', '"미완성')));
  assert.throws(() => parsePlaces(fixture().replace('nameEn', 'nameKo')), /중복/);
  const first = fixture();
  assert.throws(() => parsePlaces(first + first.slice(first.indexOf('\r\n') + 2)), /중복 ID/);
});

test('PapaParse rejects records with missing or extra columns', () => {
  assert.throws(() => parsePlaces(fixture().trimEnd() + ',"extra"\r\n'), /fields/i);
  assert.throws(() => parsePlaces(fixture().replace(/,"missing"\r\n$/, '\r\n')), /fields/i);
});

test('rejects half-filled, nonnumeric, infinite, out-of-range or swapped coordinates', () => {
  const cases: Record<string, string>[] = [
    { latitude: '37.65' },
    { latitude: 'NaN', longitude: '126.76' },
    { latitude: 'Infinity', longitude: '126.76' },
    { latitude: '126.76', longitude: '37.65' },
    { latitude: '37.65', longitude: '181' },
  ];
  for (const changes of cases) assert.throws(() => parsePlaces(fixture({ ...changes, coordinateStatus: 'unverified' })));
});

test('rejects contradictory coordinate status', () => {
  assert.throws(() => parsePlaces(fixture({ coordinateStatus: 'verified' })), /좌표 유무/);
  assert.throws(() => parsePlaces(fixture({ latitude: '37', longitude: '126' })), /좌표 유무/);
});

test('rejects dangling categories and route references', () => {
  assert.throws(() => parseAtlasData(fixture({ category: 'unknown' }), routes, categories), /미등록 category/);
  const brokenRoutes = JSON.stringify([{ ...JSON.parse(routes.replace(/^\uFEFF/, ''))[0], placeIds: ['absent'] }]);
  assert.throws(() => parseAtlasData(fixture(), brokenRoutes, categories), /없는 장소/);
});

test('rejects malformed JSON, duplicate routes and duplicate candidates', () => {
  assert.throws(() => parseAtlasData(csv, '{', categories), /올바른 JSON/);
  const route = JSON.parse(routes.replace(/^\uFEFF/, ''))[0];
  assert.throws(() => parseAtlasData(csv, JSON.stringify([route, route]), categories), /중복 ID/);
  assert.throws(() => parseAtlasData(csv, JSON.stringify([{ ...route, placeIds: [route.placeIds[0], route.placeIds[0]] }]), categories), /중복 ID/);
});
