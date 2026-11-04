import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parsePlaces } from '../../lib/data/parse';
import { filterPlaces } from '../../lib/data/filter';

const places = parsePlaces(readFileSync(new URL('../../data/places.csv', import.meta.url), 'utf8'));

test('category: returns only matching category records', () => {
  const result = filterPlaces(places, { category: 'cafe' });
  assert.ok(result.length > 0);
  assert.ok(result.every(place => place.category === 'cafe'));
});
test('query: searches English names without case sensitivity', () => {
  const result = filterPlaces(places, { query: 'ddnb' });
  assert.deepEqual(result.map(place => place.id), ['ddnb']);
});
test('both: category and query are applied together', () => {
  assert.deepEqual(filterPlaces(places, { category: 'cafe', query: 'ddnb' }).map(place => place.id), ['ddnb']);
  assert.deepEqual(filterPlaces(places, { category: 'food', query: 'ddnb' }), []);
});
test('no results: unknown queries return an empty array', () => {
  assert.deepEqual(filterPlaces(places, { query: '없는장소-xyz-123' }), []);
});
