'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AtlasData } from '@/lib/data/types';
import { coordinateLabel, visiblePlaces } from '@/lib/data/presentation';
import { siteConfig } from '@/config/site';
import PlaceCard from './PlaceCard';
import { filterPlaces } from '@/lib/data/filter';

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
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const route = siteConfig.features.themes ? data.routes.find(item => item.id === hash) : undefined;
  const viewId = route?.id ?? 'all';
  const [selection, setSelection] = useState<{ routeId: string; placeId: string } | null>(null);
  const [toast, setToast] = useState('');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const candidates = useMemo(() => visiblePlaces(data, viewId), [data, viewId]);
  const places = useMemo(() => filterPlaces(candidates, { category, query }), [candidates, category, query]);
  const selected = places.find(place => selection?.routeId === viewId && place.id === selection.placeId)
    ?? (route ? places[0] ?? null : null);
  const center = siteConfig.region.center;
  const selectPlace = useCallback((placeId: string) => {
    setSelection({ routeId: viewId, placeId });
  }, [viewId]);

  function resetFilters() {
    setCategory('all');
    setQuery('');
    setSelection(null);
    window.location.hash = 'all';
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
        {siteConfig.features.themes && <div className="tabs" role="group" aria-label="산책 테마">
          <button className={viewId === 'all' ? 'active' : ''} aria-pressed={viewId === 'all'}
            onClick={() => { setSelection(null); window.location.hash = 'all'; }}>전체</button>
          {data.routes.map(item => <button key={item.id} className={item.id === viewId ? 'active' : ''}
            aria-pressed={item.id === viewId} onClick={() => { window.location.hash = item.id; }}>
            {data.themes.find(theme => theme.id === item.id)?.nameKo ?? item.label}
          </button>)}
        </div>}
        <section className="course">
          <h2>{route?.title ?? '공원과 주변의 모든 장소'}</h2>
          <p>{route?.description ?? '명소부터 카페와 음식점까지, 등록된 장소를 한눈에 둘러보세요.'}</p>
          {route && <span className="tag">{route.durationLabel}</span>}
          <p className="note">{places.filter(place => place.longitude === null).length}곳은 좌표 미등록으로 지도에 표시되지 않습니다.</p>
        </section>
        <section className="place-filters" aria-label="장소 검색과 카테고리">
          <label htmlFor="place-search" className="search-label">장소 검색</label>
          <div className="search-field">
            <input id="place-search" type="search" value={query} placeholder="장소명·태그·주소로 검색"
              onChange={event => { setQuery(event.target.value); setSelection(null); }} aria-controls="places" />
            {query && <button type="button" onClick={() => { setQuery(''); setSelection(null); }} aria-label="검색어 지우기">×</button>}
          </div>
          <div className="category-chips" role="group" aria-label="장소 카테고리">
            <button type="button" aria-pressed={category === 'all'}
              onClick={() => { setCategory('all'); setSelection(null); }}>전체 <span>{candidates.length}</span></button>
            {data.categories.map(item => <button key={item.id} type="button" data-category={item.id}
              aria-pressed={category === item.id}
              style={category === item.id ? { backgroundColor: item.color, borderColor: item.color, color: '#fff' } : {}}
              onClick={() => { setCategory(item.id); setSelection(null); }}>
              {item.nameKo} <span>{candidates.filter(place => place.category === item.id).length}</span>
            </button>)}
          </div>
          {(category !== 'all' || query) && <button type="button" className="reset-filters" onClick={resetFilters}>필터·검색 초기화</button>}
        </section>
        <div className="listhead"><strong>{category !== 'all' || query.trim() ? '검색 결과' : route ? '함께 둘러볼 후보 장소' : '전체 장소'}</strong>
          <span role="status" aria-live="polite">{places.length}곳 · 좌표 {places.filter(place => place.longitude !== null).length}곳</span>
        </div>
        <ul id="places" className="place-list" aria-label="장소 검색 결과">
          {places.map(place => <li key={place.id}><PlaceCard place={place} selected={place.id === selected?.id} onSelect={selectPlace} /></li>)}
        </ul>
        {places.length === 0 && <div className="empty-results">
          <strong>조건에 맞는 장소가 없습니다.</strong>
          <p>검색어·카테고리 또는 산책 테마를 바꿔보세요.</p>
          <button type="button" onClick={resetFilters}>전체 장소 보기</button>
        </div>}
        <p className="note">ⓘ 후보 목록은 방문 순서가 아닙니다. 실제 위치·운영 여부·보행 동선은 확인이 필요합니다.</p>
      </aside>
      <section className="map" aria-label={`${siteConfig.region.nameKo} 실제 지도`}>
        <MapView places={places} selectedPlaceId={selected?.id ?? null} onSelectPlace={selectPlace} center={center} />
        <div className="maptitle"><strong>{siteConfig.region.nameKo} · 산책 지도</strong><small>{siteConfig.region.nameEn} · 장소별 좌표 확인 필요</small></div>
        {selected && <section className="detail" aria-live="polite">
          <div className="eyebrow">A STOP ALONG THE WAY</div>
          <h3 id="placeTitle">{selected.nameKo}</h3><p>{selected.descriptionKo}</p>
          <span className="tag" id="coordinateStatus">{coordinateLabel(selected)}</span>
          <p className="coordinate-note">{selected.coordinateStatus === 'missing'
            ? '아직 개별 위치가 등록되지 않았습니다. 운영 정보도 방문 전 확인해주세요.'
            : '좌표 출처: ' + selected.source}</p>
          {siteConfig.features.sharing && <button onClick={share}>이 보기의 링크 복사 ↗</button>}
        </section>}
        <div className="legend">● 핀 색은 장소 카테고리<br />● 숫자는 같은 좌표의 장소 수 · 클릭해 선택<br />● 강조 테두리는 선택한 장소 · 점선은 근사 좌표<br />좌표 미등록 장소는 목록에서 확인<br />실제 도보 경로는 제공하지 않습니다</div>
      </section>
    </main>
    <div className="toast" role="status">{toast}</div>
  </>;
}
