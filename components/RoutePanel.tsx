import type { Place, Route } from '@/lib/data/types';
import type { RoutePath, RoutePaths } from '@/lib/data/paths';
import { formatDuration, getMessages, type Locale } from '@/lib/i18n';

type Props = {
  route: Route;
  places: Place[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onSelectPlace: (id: string) => void;
  onClear: () => void;
  path?: RoutePath;
  pathsMeta?: RoutePaths;
  filtered?: boolean;
};

export default function RoutePanel({ route, places, locale, onLocaleChange, onSelectPlace, onClear, path, pathsMeta, filtered = false }: Props) {
  const t = getMessages(locale);
  const byId = new Map(places.map(place => [place.id, place]));
  const totalsAvailable = path?.status === 'ready' && !filtered;
  const unavailable = filtered ? t.route.hiddenByFilter : t.route.notCalculated;
  return <section className="course route-panel" aria-labelledby="route-title" lang={locale}>
    <p className="route-straight-notice">{t.route.networkNotice}</p>
    <div className="route-toolbar">
      <div className="route-languages" role="group" aria-label="코스 표시 언어">
        <button type="button" aria-pressed={locale === 'ko'} onClick={() => onLocaleChange('ko')}>한국어</button>
        <button type="button" aria-pressed={locale === 'en'} onClick={() => onLocaleChange('en')}>English</button>
      </div>
      <button type="button" className="clear-route" onClick={onClear}>{t.route.clear}</button>
    </div>
    <h2 id="route-title">{locale === 'ko' ? route.titleKo : route.titleEn}</h2>
    <p className="course-description">{locale === 'ko' ? route.descriptionKo : route.descriptionEn}</p>
    <p className="network-status" role="status">{!path || path.status === 'unavailable' ? t.route.networkUnavailable
      : path.status === 'partial' ? t.route.networkPartial : t.route.networkReady}</p>
    {filtered && <p className="note">{t.route.networkFiltered}</p>}
    <dl className="route-metrics">
      <div><dt>{t.route.distance}</dt><dd>{totalsAvailable ? `${Math.round(path!.totalDistanceM!)} m` : unavailable}</dd></div>
      <div className="route-total-duration"><dt>{t.route.totalDuration}</dt><dd>{totalsAvailable ? `≈ ${formatDuration(path!.totalDurationS, locale)}` : unavailable}</dd></div>
    </dl>
    {pathsMeta && <p className="network-speed">{t.route.speedNotice} ({pathsMeta.walkingSpeedKmh} km/h)</p>}
    <ol className="route-itinerary" aria-label={t.route.stops}>
      {route.placeIds.map((id, index) => {
        const place = byId.get(id)!;
        return <li key={`${index}-${id}`}><button type="button" data-stop-id={id} onClick={() => onSelectPlace(id)}>
          {locale === 'en' && place.nameEn ? place.nameEn : place.nameKo}
        </button>
          {index < route.placeIds.length - 1 && <div className="route-leg-time" data-leg={`${index + 1}-${index + 2}`}>
            <div className="route-leg-summary"><span>{index + 1} → {index + 2}</span>
              <strong>{filtered ? t.route.hiddenByFilter : path?.segments[index]?.status === 'ready'
                ? `≈ ${formatDuration(path.segments[index].durationS, locale)}` : t.route.notCalculated}</strong></div>
            {!filtered && path?.segments[index]?.reason && <small>{t.route.reasons[path.segments[index].reason!]}</small>}
          </div>}
        </li>;
      })}
    </ol>
    <p className="note">{t.route.visits}: {route.placeIds.length} · {t.route.places}: {new Set(route.placeIds).size}. {t.route.revisitNotice}</p>
    {pathsMeta && <p className="network-provenance">{pathsMeta.source}<br />© OpenStreetMap contributors · {pathsMeta.license}<br />{pathsMeta.generatedAt.slice(0, 10)}</p>}
  </section>;
}
