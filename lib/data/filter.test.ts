import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePlaces } from './parse';
import { filterPlaces } from './filter';

const base = parsePlaces(readFileSync(new URL('../../data/places.csv', import.meta.url), 'utf8'))[0];
const places = [
  { ...base, id: 'garden', category: 'nature', nameKo: '호수 정원', nameEn: 'Lake Garden', tags: '가족,꽃', address: '경기 고양시 호수로 595', descriptionKo: '검색 제외 설명', icon: 'Trees' },
  { ...base, id: 'cafe', category: 'cafe', nameKo: '산책 카페', nameEn: 'Walking Cafe', tags: '커피,휴식', address: '경기 고양시 중앙로 10', icon: 'Coffee' },
  { ...base, id: 'empty', category: 'food', nameKo: '식당', nameEn: '', tags: '', address: '', icon: 'Utensils' },
];

test('empty, whitespace queries and all category return every place in source order', () => {
  for (const options of [{}, { category: 'all', query: '' }, { category: null, query: ' \t ' }]) {
    const result = filterPlaces(places, options);
    assert.deepEqual(result, places);
    assert.notEqual(result, places);
  }
});

test('matches exact category IDs and combines category with query', () => {
  assert.deepEqual(filterPlaces(places, { category: 'nature', query: 'lake' }).map(p => p.id), ['garden']);
  assert.deepEqual(filterPlaces(places, { category: 'cafe', query: 'lake' }), []);
  assert.deepEqual(filterPlaces(places, { category: 'unknown' }), []);
});

test('searches Korean and English names case insensitively', () => {
  assert.deepEqual(filterPlaces(places, { query: '정원' }).map(p => p.id), ['garden']);
  assert.deepEqual(filterPlaces(places, { query: '  WALKING cafe  ' }).map(p => p.id), ['cafe']);
});

test('searches tags and addresses and requires all whitespace-separated terms', () => {
  assert.deepEqual(filterPlaces(places, { query: '가족' }).map(p => p.id), ['garden']);
  assert.deepEqual(filterPlaces(places, { query: '중앙로 10' }).map(p => p.id), ['cafe']);
  assert.deepEqual(filterPlaces(places, { query: '꽃 595' }).map(p => p.id), ['garden']);
  assert.deepEqual(filterPlaces(places, { query: '꽃 커피' }), []);
});

test('normalizes Unicode and treats regex or HTML input as literal text', () => {
  assert.deepEqual(filterPlaces(places, { query: '호수'.normalize('NFD') }).map(p => p.id), ['garden']);
  assert.deepEqual(filterPlaces(places, { query: 'ＬＡＫＥ' }).map(p => p.id), ['garden']);
  for (const query of ['.*', '[', '<script>']) assert.deepEqual(filterPlaces(places, { query }), []);
});

test('does not search descriptions and tolerates empty optional fields and input', () => {
  assert.deepEqual(filterPlaces(places, { query: '검색 제외 설명' }), []);
  assert.deepEqual(filterPlaces(places, { query: '식당' }).map(p => p.id), ['empty']);
  assert.deepEqual(filterPlaces([], { query: 'lake' }), []);
});

test('retains enriched fields and does not mutate frozen records', () => {
  const frozen = Object.freeze(places.map(place => Object.freeze({ ...place })));
  const before = structuredClone(frozen);
  const result = filterPlaces(frozen, { query: 'lake' });
  assert.equal(result[0], frozen[0]);
  assert.equal(result[0].icon, 'Trees');
  assert.deepEqual(frozen, before);
});
