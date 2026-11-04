import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseAtlasData } from '../../lib/data/parse';
import { visiblePlaces } from '../../lib/data/presentation';
import PlaceDetails from '../../components/PlaceDetails';

const read = (name: string) => readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8');
const base = visiblePlaces(parseAtlasData(read('places.csv'), read('routes.json'), read('categories.json')), 'all')[0];
const close = () => {};

test('missing fields are hidden and absent images use category color', () => {
  const place = { ...base, address: '', openingHours: '', tags: '', source: '', license: '', externalUrl: '', imageUrl: '' };
  const html = renderToStaticMarkup(<PlaceDetails place={place} onClose={close} />);
  for (const field of ['주소', '영업시간', '태그', '출처', '라이선스']) assert.ok(!html.includes(`<dt>${field}</dt>`));
  assert.ok(html.includes(`background-color:${place.color}`));
  assert.ok(!html.includes('<img'));
});
test('supplied details are escaped and directions use original coordinates', () => {
  const place = { ...base, openingHours: '09:00–18:00', tags: '<script>alert(1)</script>', address: '실제 입력 주소' };
  const html = renderToStaticMarkup(<PlaceDetails place={place} onClose={close} />);
  assert.ok(html.includes('<dt>영업시간</dt>'));
  assert.ok(html.includes('09:00–18:00'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes(encodeURIComponent(`${place.latitude},${place.longitude}`)));
});
test('no direction link is fabricated for missing coordinates', () => {
  const html = renderToStaticMarkup(<PlaceDetails place={{ ...base, latitude: null, longitude: null }} onClose={close} />);
  assert.ok(!html.includes('google.com/maps/dir'));
});
