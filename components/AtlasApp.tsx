'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AtlasData } from '@/lib/data/types';
import { visiblePlaces } from '@/lib/data/presentation';
import { siteConfig } from '@/config/site';
import PlaceCard from './PlaceCard';
import { filterPlaces } from '@/lib/data/filter';
import PlaceDetails from './PlaceDetails';
import { getRouteBounds } from '@/lib/data/route';
import { buildNetworkRoute } from '@/lib/data/paths';
import RoutePanel from './RoutePanel';
import type { Locale } from '@/lib/i18n';
import RecommendPanel from './routes/RecommendPanel';
import { MyRouteProvider, useMyRoute } from './routes/MyRouteProvider';
import { QRCodeSVG } from 'qrcode.react';
import { track, type AnalyticsScope } from '@/lib/analytics';

const MapView = dynamic(() => import('./map/MapView'), {
  ssr: false,
  loading: () => <div className="map-status" role="status">지도를 불러오는 중입니다.</div>,
});

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const getHash = () => window.location.hash.slice(1).split('?')[0];
const getServerHash = () => '';

export default function AtlasApp({ data }: { data: AtlasData }) {
  return <MyRouteProvider><AtlasContent data={data} /></MyRouteProvider>;
}

function AtlasContent({ data }: { data: AtlasData }) {
  const myRoute = useMyRoute();
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const route = siteConfig.features.themes ? data.routes.find(item => item.routeId === hash) : undefined;
  const viewId = route ? hash : 'all';
  const [selection, setSelection] = useState<{ routeId: string; placeId: string; origin: 'map' | 'card' | 'itinerary' } | null>(null);
  const [locale, setLocale] = useState<Locale>('ko');
  const [cameraRequest, setCameraRequest] = useState(0);
  const [toast, setToast] = useState('');
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrScope, setQrScope] = useState<AnalyticsScope>('map');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    try { const saved = localStorage.getItem('local-map-locale'); if (saved === 'ko' || saved === 'en') setLocale(saved); } catch { /* Use the default locale. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('local-map-locale', locale); } catch { /* Switching remains available for this session. */ }
  }, [locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    const placeId = params.get('place');
    const sharedRoute = params.get('myRoute');
    if (sharedRoute) {
      const ids = sharedRoute.split(',').filter(id => data.places.some(place => place.id === id));
      if (ids.length >= 3 && ids.length <= 7) myRoute.replace(ids);
    }
    if (placeId && data.places.some(place => place.id === placeId)) {
      setSelection({ routeId: viewId, placeId, origin: 'map' });
    }
  // Restore a shared place or recommended route once on initial load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const candidates = useMemo(() => visiblePlaces(data, viewId), [data, viewId]);
  const localizedCategories = useMemo(() => data.categories.map(item => ({ ...item, nameKo: locale === 'en' ? item.nameEn : item.nameKo })), [data.categories, locale]);
  const categoryById = useMemo(() => new Map(localizedCategories.map(item => [item.id, item.nameKo])), [localizedCategories]);
  const localizedPlaces = useMemo(() => candidates.map(place => ({ ...place,
    nameKo: locale === 'en' ? place.nameEn || place.nameKo : place.nameKo,
    descriptionKo: locale === 'en' ? place.descriptionEn || place.descriptionKo : place.descriptionKo,
    categoryNameKo: categoryById.get(place.category) ?? place.categoryNameKo,
  })), [candidates, categoryById, locale]);
  const locatedCandidates = useMemo(() => localizedPlaces.filter(place => place.latitude !== null && place.longitude !== null), [localizedPlaces]);
  const filtered = useMemo(() => filterPlaces(localizedPlaces, { category, query }), [localizedPlaces, category, query]);
  // Exactly this one array is used by cards, count, and map pins.
  const places = useMemo(() => filtered.filter(place => place.latitude !== null && place.longitude !== null), [filtered]);
  const unlocated = useMemo(() => filtered.filter(place => place.latitude === null || place.longitude === null), [filtered]);
  const networkPath = route ? data.routePaths?.routes[route.routeId] : undefined;
  const networkRoute = useMemo(() => buildNetworkRoute(networkPath, places), [networkPath, places]);
  const routeBounds = useMemo(() => route ? getRouteBounds([
    ...candidates,
    ...(networkPath?.segments.flatMap(segment => segment.geometry.map(([longitude, latitude]) => ({ longitude, latitude }))) ?? []),
  ]) : myRoute.placeIds.length ? getRouteBounds(data.places.filter(place => myRoute.placeIds.includes(place.id))) : null,
  [route, candidates, networkPath, myRoute.placeIds, data.places]);
  const selected = filtered.find(place => selection?.routeId === viewId && place.id === selection.placeId) ?? null;
  const center = siteConfig.region.center;
  const selectPlace = useCallback((placeId: string) => {
    const place = data.places.find(item => item.id === placeId);
    if (place) track('place_open', { place_id: place.id, category: place.category });
    setSelection({ routeId: viewId, placeId, origin: 'card' });
  }, [data.places, viewId]);
  const selectFromMap = useCallback((placeId: string) => {
    const place = data.places.find(item => item.id === placeId);
    if (place) track('place_open', { place_id: place.id, category: place.category });
    setSelection({ routeId: viewId, placeId, origin: 'map' });
  }, [data.places, viewId]);
  useEffect(() => {
    if (selected && selection?.origin === 'map') {
      document.getElementById(`place-card-${selected.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [selected, selection?.origin]);

  function resetFilters() {
    setCategory('all');
    setQuery('');
    setSelection(null);
    setCameraRequest(value => value + 1);
    window.location.hash = 'all';
  }

  function selectStop(placeId: string) {
    const place = data.places.find(item => item.id === placeId);
    if (place) track('place_open', { place_id: place.id, category: place.category });
    setCategory('all');
    setQuery('');
    setSelection({ routeId: viewId, placeId, origin: 'itinerary' });
    setCameraRequest(value => value + 1);
  }

  async function copyShareLink() {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      track('share', { scope: qrScope });
      setToast('공유 링크를 복사했습니다.');
    } catch {
      setToast('링크를 복사할 수 없습니다. 공유 링크를 직접 복사해주세요.');
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }

  function openShare(kind: 'map' | 'route' | 'place') {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    if (kind === 'place' && selected) params.set('place', selected.id);
    if (kind === 'route' && myRoute.placeIds.length) params.set('myRoute', myRoute.placeIds.join(','));
    url.hash = `${kind === 'route' && !myRoute.placeIds.length ? viewId : 'all'}${params.size ? `?${params}` : ''}`;
    setQrScope(kind);
    setQrUrl(url.href);
  }

  function downloadQr() {
    const svg = document.querySelector<SVGSVGElement>('.share-qr');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `local-map-${qrScope}-qr.svg`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    track('qr_download', { scope: qrScope });
  }

  return <>
    <header>
      <div className="brand"><span>◒</span> {siteConfig.brand.name} <span className="subtitle">{locale === 'ko' ? siteConfig.brand.taglineKo : siteConfig.brand.taglineEn}</span></div>
      <div className="header-actions">
        <div className="draft">{locale === 'ko' ? 'LOCAL MAP · 화면 초안 01' : 'LOCAL MAP · PREVIEW 01'}</div>
        <div className="language-switch" role="group" aria-label="Display language">
          <button type="button" aria-pressed={locale === 'ko'} onClick={() => { setLocale('ko'); document.documentElement.lang = 'ko'; }}>한국어</button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => { setLocale('en'); document.documentElement.lang = 'en'; }}>English</button>
        </div>
      </div>
    </header>
    <main lang={locale}>
      <aside>
        <div className="eyebrow">{locale === 'ko' ? siteConfig.brand.taglineEn : 'WALKS AROUND ILSAN LAKE PARK'}</div>
        <h1>{locale === 'ko' ? '이번 주말은, 호수에서 만나요.' : 'Meet You by the Lake'}</h1>
        <p>{locale === 'ko' ? '아이의 걸음에 맞춰 천천히. 우리 가족의 산책 테마를 골라보세요.' : 'Take a gentle walk at your own pace. Choose a theme for your visit.'}</p>
        {siteConfig.features.themes && <div className="tabs" role="group" aria-label={locale === 'ko' ? '산책 코스' : 'Walking routes'}>
          <button className={viewId === 'all' ? 'active' : ''} aria-pressed={viewId === 'all'}
            onClick={resetFilters}>{locale === 'ko' ? '전체' : 'All places'}</button>
          {data.routes.map(item => <button key={item.routeId} className={item.routeId === viewId ? 'active' : ''}
            aria-pressed={item.routeId === viewId} onClick={() => {
              track('route_open', { route_id: item.routeId });
              setCategory('all'); setQuery(''); setSelection(null);
              setCameraRequest(value => value + 1);
              window.location.hash = item.routeId;
            }}>
            {locale === 'ko' ? item.titleKo : item.titleEn}
          </button>)}
        </div>}
        {route ? <RoutePanel route={route} places={localizedPlaces} locale={locale} onLocaleChange={setLocale}
          onSelectPlace={selectStop} onClear={resetFilters} path={networkPath} pathsMeta={data.routePaths} filtered={networkRoute.filtered} /> : <section className="course">
          <h2>{locale === 'ko' ? '공원과 주변의 모든 장소' : 'Explore places around the park'}</h2>
          <p>{locale === 'ko' ? '명소부터 카페와 음식점까지, 등록된 장소를 한눈에 둘러보세요.' : 'Browse landmarks, cafes, and places to eat around the park.'}</p>
          {unlocated.length > 0 && <p className="note">좌표 미등록 {unlocated.length}곳은 아래 별도 목록에서 확인할 수 있습니다.</p>}
        </section>}
        <section className="place-filters" aria-label={locale === 'ko' ? '장소 검색과 카테고리' : 'Search and filter places'}>
          <label htmlFor="place-search" className="search-label">{locale === 'ko' ? '장소 검색' : 'Search places'}</label>
          <div className="search-field">
            <input id="place-search" type="search" value={query} placeholder={locale === 'ko' ? '장소명·태그·주소로 검색' : 'Search names, tags, or addresses'}
              onChange={event => { setQuery(event.target.value); setSelection(null); }} aria-controls="places" />
            {query && <button type="button" onClick={() => { setQuery(''); setSelection(null); }} aria-label="검색어 지우기">×</button>}
          </div>
          <div className="category-chips" role="group" aria-label={locale === 'ko' ? '장소 카테고리' : 'Place categories'}>
            <button type="button" aria-pressed={category === 'all'}
              onClick={() => { setCategory('all'); setSelection(null); }}>{locale === 'ko' ? '전체' : 'All'} <span>{locatedCandidates.length}</span></button>
            {localizedCategories.map(item => <button key={item.id} type="button" data-category={item.id}
              aria-pressed={category === item.id}
              style={category === item.id ? { backgroundColor: item.color, borderColor: item.color, color: '#fff' } : {}}
              onClick={() => { setCategory(item.id); setSelection(null); }}>
              {item.nameKo} <span>{locatedCandidates.filter(place => place.category === item.id).length}</span>
            </button>)}
          </div>
          <button type="button" className="reset-filters" onClick={resetFilters}>{locale === 'ko' ? '필터 초기화' : 'Reset filters'}</button>
        </section>
        <div className="listhead"><strong>{category !== 'all' || query.trim() ? (locale === 'ko' ? '검색 결과' : 'Search results') : route ? (locale === 'ko' ? '코스 방문 장소' : 'Places on this route') : (locale === 'ko' ? '전체 장소' : 'All places')}</strong>
          <span role="status" aria-live="polite">{places.length} {locale === 'ko' ? '곳' : places.length === 1 ? 'place' : 'places'}</span>
        </div>
        <ul id="places" className="place-list" aria-label={locale === 'ko' ? '장소 검색 결과' : 'Place search results'}>
          {places.map(place => <li key={place.id}><PlaceCard place={place} locale={locale} categoryName={categoryById.get(place.category) ?? place.categoryNameKo} selected={place.id === selected?.id} onSelect={selectPlace} /></li>)}
        </ul>
        {places.length === 0 && <div className="empty-results">
          <strong>조건에 맞는 장소가 없습니다.</strong>
          <p>검색어·카테고리 또는 산책 테마를 바꿔보세요.</p>
          <button type="button" onClick={resetFilters}>필터 초기화</button>
        </div>}
        {unlocated.length > 0 && <details className="unlocated-places">
          <summary>좌표 미등록 {unlocated.length}곳</summary>
          <p>좌표가 없어 지도·카드 결과 수에서 제외했습니다.</p>
          <ul>{unlocated.map(place => <li key={place.id}>{place.nameKo}</li>)}</ul>
        </details>}
        <p className="note">ⓘ {route ? '위 순서는 기획 방문 순서이며, 실제 보행 동선은 미검증입니다.' : '장소 목록은 방문 순서가 아닙니다.'} 실제 위치·운영 여부는 방문 전 확인해주세요.</p>
      </aside>
      <section className="map" aria-label={locale === 'ko' ? `${siteConfig.region.nameKo} 실제 지도` : `${siteConfig.region.nameEn} map`}>
        <MapView places={(myRoute.placeIds.length ? localizedPlaces.filter(place => myRoute.placeIds.includes(place.id)) : places).map(place => myRoute.placeIds.length ? { ...place, icon: 'Trees', color: '#26765b', categoryNameKo: '' } : place)} locale={locale} routeLine={myRoute.placeIds.length ? myRoute.routePath?.geojson ?? { type: 'FeatureCollection', features: [] } : networkRoute.geojson} routeBounds={routeBounds} cameraRequest={cameraRequest} selectedPlaceId={selected?.id ?? null} onSelectPlace={selectFromMap} center={center} />
        <div className="maptitle"><strong>{locale === 'ko' ? `${siteConfig.region.nameKo} · 산책 지도` : `${siteConfig.region.nameEn} · Walking map`}</strong><small>{locale === 'ko' ? `${siteConfig.region.nameEn} · 장소별 좌표 확인 필요` : 'Place coordinates may need verification'}</small></div>
        {siteConfig.features.sharing && <div className="map-share-actions" role="group" aria-label="Share QR codes">
          <button type="button" onClick={() => openShare('map')}>{locale === 'ko' ? '전체 지도 QR' : 'Map QR'}</button>
          <button type="button" onClick={() => openShare('route')}>{locale === 'ko' ? '현재 코스 QR' : 'Route QR'}</button>
        </div>}
        <button type="button" className="recommend-trigger" aria-expanded={recommendOpen} aria-controls="map-recommend-panel"
          onClick={() => setRecommendOpen(true)}>{locale === 'ko' ? '나에게 맞는 코스' : 'A route for you'}</button>
        {recommendOpen && <>
          <button type="button" className="recommend-backdrop" aria-label={locale === 'ko' ? '추천 패널 닫기' : 'Close recommendations'} onClick={() => setRecommendOpen(false)} />
          <div id="map-recommend-panel" className="recommend-overlay" role="dialog" aria-modal="true" aria-label={locale === 'ko' ? '나에게 맞는 코스' : 'A route for you'}>
            <button type="button" className="recommend-close" aria-label={locale === 'ko' ? '추천 패널 닫기' : 'Close recommendations'} onClick={() => setRecommendOpen(false)}>×</button>
            <RecommendPanel places={localizedPlaces} themes={data.themes} locale={locale} />
          </div>
        </>}
        {selected && <PlaceDetails key={selected.id} place={selected} onClose={() => setSelection(null)}
          onShare={siteConfig.features.sharing ? () => openShare('place') : undefined} locale={locale} categoryName={categoryById.get(selected.category) ?? selected.categoryNameKo} />}
        <div className="legend">● 지도·카드 {places.length}곳<br />● 핀 색은 장소 카테고리<br />● 동일 좌표의 핀 간격은 화면상 구분용<br />● 강조 테두리는 선택 · 점선 테두리는 근사 좌표<br />{route ? '━ 번호는 방문 순서 · 실선은 OSM 보행망 계산 경로' : '코스를 선택하면 OSM 보행망 경로를 표시합니다'}</div>
      </section>
    </main>
    <div className="toast" role="status">{toast}</div>
    {qrUrl && <div className="qr-backdrop" role="presentation" onClick={() => setQrUrl(null)}>
      <section className="qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={event => event.stopPropagation()}>
        <button type="button" className="qr-close" onClick={() => setQrUrl(null)} aria-label={locale === 'ko' ? 'QR 코드 닫기' : 'Close QR code'}>×</button>
        <h2 id="qr-title">{locale === 'ko' ? 'QR 코드로 열기' : 'Open with QR code'}</h2>
        <QRCodeSVG className="share-qr" value={qrUrl} size={280} level="M" includeMargin aria-label={locale === 'ko' ? '공유 링크 QR 코드' : 'QR code for this link'} />
        <button type="button" onClick={copyShareLink}>{locale === 'ko' ? '공유 링크 복사' : 'Copy share link'}</button>
        <button type="button" onClick={downloadQr}>{locale === 'ko' ? 'QR 코드 저장' : 'Save QR code'}</button>
        <a href={qrUrl}>{locale === 'ko' ? '공유 링크 열기' : 'Open shared link'}</a>
      </section>
    </div>}
  </>;
}
