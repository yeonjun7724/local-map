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

const MapView = dynamic(() => import('./map/MapView'), {
  ssr: false,
  loading: () => <div className="map-status" role="status">지도를 불러오는 중입니다.</div>,
});

function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const getHash = () => window.location.hash.slice(1);
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
  const [routeLocale, setRouteLocale] = useState<Locale>('ko');
  const [cameraRequest, setCameraRequest] = useState(0);
  const [toast, setToast] = useState('');
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const candidates = useMemo(() => visiblePlaces(data, viewId), [data, viewId]);
  const locatedCandidates = useMemo(() => candidates.filter(place => place.latitude !== null && place.longitude !== null), [candidates]);
  const filtered = useMemo(() => filterPlaces(candidates, { category, query }), [candidates, category, query]);
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
    setSelection({ routeId: viewId, placeId, origin: 'card' });
  }, [viewId, setSelection]);
  const selectFromMap = useCallback((placeId: string) => {
    setSelection({ routeId: viewId, placeId, origin: 'map' });
  }, [viewId, setSelection]);
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
    setCategory('all');
    setQuery('');
    setSelection({ routeId: viewId, placeId, origin: 'itinerary' });
    setCameraRequest(value => value + 1);
  }

  async function share() {
    const url = new URL(window.location.href);
    url.hash = viewId;
    try {
      await navigator.clipboard.writeText(url.href);
      setToast('선택한 보기의 링크를 복사했습니다.');
    } catch {
      setToast('주소창의 링크를 복사해주세요: ' + url.href);
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }

  return <>
    <header>
      <div className="brand"><span>◒</span> {siteConfig.brand.name} <span className="subtitle">{siteConfig.brand.taglineKo}</span></div>
      <div className="draft">LOCAL MAP · 화면 초안 01</div>
    </header>
    <main>
      <aside>
        <div className="eyebrow">{siteConfig.brand.taglineEn}</div>
        <h1>이번 주말은,<br />호수에서 만나요.</h1>
        <p>아이의 걸음에 맞춰 천천히.<br />우리 가족의 산책 테마를 골라보세요.</p>
        {siteConfig.features.themes && <div className="tabs" role="group" aria-label="산책 코스">
          <button className={viewId === 'all' ? 'active' : ''} aria-pressed={viewId === 'all'}
            onClick={resetFilters}>전체</button>
          {data.routes.map(item => <button key={item.routeId} className={item.routeId === viewId ? 'active' : ''}
            aria-pressed={item.routeId === viewId} onClick={() => {
              setCategory('all'); setQuery(''); setSelection(null);
              setCameraRequest(value => value + 1);
              window.location.hash = item.routeId;
            }}>
            {item.titleKo}
          </button>)}
        </div>}
        {route ? <RoutePanel route={route} places={data.places} locale={routeLocale} onLocaleChange={setRouteLocale}
          onSelectPlace={selectStop} onClear={resetFilters} path={networkPath} pathsMeta={data.routePaths} filtered={networkRoute.filtered} /> : <section className="course">
          <h2>공원과 주변의 모든 장소</h2>
          <p>명소부터 카페와 음식점까지, 등록된 장소를 한눈에 둘러보세요.</p>
          {unlocated.length > 0 && <p className="note">좌표 미등록 {unlocated.length}곳은 아래 별도 목록에서 확인할 수 있습니다.</p>}
        </section>}
        <section className="place-filters" aria-label="장소 검색과 카테고리">
          <label htmlFor="place-search" className="search-label">장소 검색</label>
          <div className="search-field">
            <input id="place-search" type="search" value={query} placeholder="장소명·태그·주소로 검색"
              onChange={event => { setQuery(event.target.value); setSelection(null); }} aria-controls="places" />
            {query && <button type="button" onClick={() => { setQuery(''); setSelection(null); }} aria-label="검색어 지우기">×</button>}
          </div>
          <div className="category-chips" role="group" aria-label="장소 카테고리">
            <button type="button" aria-pressed={category === 'all'}
              onClick={() => { setCategory('all'); setSelection(null); }}>전체 <span>{locatedCandidates.length}</span></button>
            {data.categories.map(item => <button key={item.id} type="button" data-category={item.id}
              aria-pressed={category === item.id}
              style={category === item.id ? { backgroundColor: item.color, borderColor: item.color, color: '#fff' } : {}}
              onClick={() => { setCategory(item.id); setSelection(null); }}>
              {item.nameKo} <span>{locatedCandidates.filter(place => place.category === item.id).length}</span>
            </button>)}
          </div>
          <button type="button" className="reset-filters" onClick={resetFilters}>필터 초기화</button>
        </section>
        <div className="listhead"><strong>{category !== 'all' || query.trim() ? '검색 결과' : route ? '코스 방문 장소' : '전체 장소'}</strong>
          <span role="status" aria-live="polite">{places.length}곳</span>
        </div>
        <ul id="places" className="place-list" aria-label="장소 검색 결과">
          {places.map(place => <li key={place.id}><PlaceCard place={place} selected={place.id === selected?.id} onSelect={selectPlace} /></li>)}
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
      <section className="map" aria-label={`${siteConfig.region.nameKo} 실제 지도`}>
        <MapView places={myRoute.placeIds.length ? data.places.filter(place => myRoute.placeIds.includes(place.id)).map(place => ({ ...place, icon: 'Trees', color: '#26765b', categoryNameKo: '' })) : places} routeLine={myRoute.placeIds.length ? myRoute.routePath?.geojson ?? { type: 'FeatureCollection', features: [] } : networkRoute.geojson} routeBounds={routeBounds} cameraRequest={cameraRequest} selectedPlaceId={selected?.id ?? null} onSelectPlace={selectFromMap} center={center} />
        <div className="maptitle"><strong>{siteConfig.region.nameKo} · 산책 지도</strong><small>{siteConfig.region.nameEn} · 장소별 좌표 확인 필요</small></div>
        <button type="button" className="recommend-trigger" aria-expanded={recommendOpen} aria-controls="map-recommend-panel"
          onClick={() => setRecommendOpen(true)}>{routeLocale === 'ko' ? '나에게 맞는 코스' : 'A route for you'}</button>
        {recommendOpen && <>
          <button type="button" className="recommend-backdrop" aria-label="추천 패널 닫기" onClick={() => setRecommendOpen(false)} />
          <div id="map-recommend-panel" className="recommend-overlay" role="dialog" aria-modal="true" aria-label="나에게 맞는 코스">
            <button type="button" className="recommend-close" aria-label="추천 패널 닫기" onClick={() => setRecommendOpen(false)}>×</button>
            <RecommendPanel places={data.places} themes={data.themes} locale={routeLocale} />
          </div>
        </>}
        {selected && <PlaceDetails key={selected.id} place={selected} onClose={() => setSelection(null)}
          onShare={siteConfig.features.sharing ? share : undefined} />}
        <div className="legend">● 지도·카드 {places.length}곳<br />● 핀 색은 장소 카테고리<br />● 동일 좌표의 핀 간격은 화면상 구분용<br />● 강조 테두리는 선택 · 점선 테두리는 근사 좌표<br />{route ? '━ 번호는 방문 순서 · 실선은 OSM 보행망 계산 경로' : '코스를 선택하면 OSM 보행망 경로를 표시합니다'}</div>
      </section>
    </main>
    <div className="toast" role="status">{toast}</div>
  </>;
}
