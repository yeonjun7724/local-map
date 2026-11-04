import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import RoutePanel from '../../components/RoutePanel';
import { parseAtlasData } from '../../lib/data/parse';
import { getMessages, type Locale } from '../../lib/i18n';

const read = (name: string) => readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8');
const data = parseAtlasData(read('places.csv'), read('routes.json'), read('categories.json'));
const noop = () => {};
function render(locale: Locale, route = data.routes[0], missingLegs = 0, coincidentLegs = 0) {
  return renderToStaticMarkup(<RoutePanel route={route} places={data.places} locale={locale}
    onLocaleChange={noop} onSelectPlace={noop} onClear={noop} lineStatus={{ missingLegs, coincidentLegs }} />);
}

test('shared i18n straight notice is always rendered before the route title', () => {
  for (const locale of ['ko', 'en'] as const) {
    for (const route of data.routes) {
      const html = render(locale, route);
      const notice = getMessages(locale).route.straightNotice;
      assert.ok(html.includes(notice));
      assert.ok(html.indexOf(notice) < html.indexOf('id="route-title"'));
    }
  }
});
test('panel uses Korean or English titles descriptions and original stop names', () => {
  for (const locale of ['ko', 'en'] as const) {
    const route = data.routes[0];
    const html = render(locale);
    assert.ok(html.includes(locale === 'ko' ? route.titleKo : route.titleEn));
    assert.ok(html.includes(locale === 'ko' ? route.descriptionKo : route.descriptionEn));
    const first = data.places.find(place => place.id === route.placeIds[0])!;
    assert.ok(html.includes(locale === 'ko' ? first.nameKo : first.nameEn));
  }
});
test('round-trip itinerary retains both clickable start and end stops', () => {
  const html = render('ko', data.routes[1]);
  assert.equal(html.split('data-stop-id=').length - 1, 4);
  assert.equal(html.split('data-stop-id="ilsan-lake-park"').length - 1, 2);
  assert.ok(html.includes('코스 해제'));
});
test('missing and coincident legs do not hide the straight notice', () => {
  const html = render('ko', data.routes[0], 2, 1);
  const t = getMessages('ko');
  for (const message of [t.route.straightNotice, t.route.missingNotice, t.route.coincidentNotice]) assert.ok(html.includes(message));
});
