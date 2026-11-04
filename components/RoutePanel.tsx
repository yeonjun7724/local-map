import type { Place, Route } from '@/lib/data/types';
import type { buildStraightRoute } from '@/lib/data/route';
import { getMessages, type Locale } from '@/lib/i18n';

type Props = {
  route: Route;
  places: Place[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onSelectPlace: (id: string) => void;
  onClear: () => void;
  lineStatus: Pick<ReturnType<typeof buildStraightRoute>, 'missingLegs' | 'coincidentLegs'>;
};

export default function RoutePanel({ route, places, locale, onLocaleChange, onSelectPlace, onClear, lineStatus }: Props) {
  const t = getMessages(locale);
  const byId = new Map(places.map(place => [place.id, place]));
  return <section className="course route-panel" aria-labelledby="route-title" lang={locale}>
    <p className="route-straight-notice">{t.route.straightNotice}</p>
    <div className="route-toolbar">
      <div className="route-languages" role="group" aria-label="코스 표시 언어">
        <button type="button" aria-pressed={locale === 'ko'} onClick={() => onLocaleChange('ko')}>한국어</button>
        <button type="button" aria-pressed={locale === 'en'} onClick={() => onLocaleChange('en')}>English</button>
      </div>
      <button type="button" className="clear-route" onClick={onClear}>{t.route.clear}</button>
    </div>
    <h2 id="route-title">{locale === 'ko' ? route.titleKo : route.titleEn}</h2>
    <p className="course-description">{locale === 'ko' ? route.descriptionKo : route.descriptionEn}</p>
    <ol className="route-itinerary" aria-label={t.route.stops}>
      {route.placeIds.map((id, index) => {
        const place = byId.get(id)!;
        return <li key={`${index}-${id}`}><button type="button" data-stop-id={id} onClick={() => onSelectPlace(id)}>
          {locale === 'en' && place.nameEn ? place.nameEn : place.nameKo}
        </button></li>;
      })}
    </ol>
    <p className="note">{t.route.visits}: {route.placeIds.length} · {t.route.places}: {new Set(route.placeIds).size}. {t.route.revisitNotice}</p>
    {lineStatus.missingLegs > 0 && <p className="note">{t.route.missingNotice}</p>}
    {lineStatus.coincidentLegs > 0 && <p className="note">{t.route.coincidentNotice}</p>}
  </section>;
}
