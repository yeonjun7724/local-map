'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AtlasData } from '@/lib/data/types';
import { coordinateLabel, visiblePlaces } from '@/lib/data/presentation';

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
  const route = data.routes.find(item => item.id === hash);
  const viewId = route?.id ?? 'all';
  const [selection, setSelection] = useState<{ routeId: string; placeId: string } | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const placesById = useMemo(() => new Map(data.places.map(place => [place.id, place])), [data.places]);
  const places = useMemo(() => visiblePlaces(data, viewId), [data, viewId]);
  const selected = places.find(place => selection?.routeId === viewId && place.id === selection.placeId)
    ?? (route ? places[0] : null);
  const center = useMemo<[number, number]>(() => {
    const park = placesById.get('ilsan-lake-park');
    if (park?.longitude == null || park.latitude == null) throw new Error('공원의 지도 시작 좌표가 없습니다');
    return [park.longitude, park.latitude];
  }, [placesById]);
  const selectPlace = useCallback((placeId: string) => {
    setSelection({ routeId: viewId, placeId });
  }, [viewId]);

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
      <div className="brand"><span>◒</span> 호수산책 <span className="subtitle">아이와 함께, 가까운 자연으로</span></div>
      <div className="draft">LOCAL MAP · 화면 초안 01</div>
    </header>
    <main>
      <aside>
        <div className="eyebrow">A LITTLE WALK, A LOVELY DAY</div>
        <h1>이번 주말은,<br />호수에서 만나요.</h1>
        <p>아이의 걸음에 맞춰 천천히.<br />우리 가족의 산책 테마를 골라보세요.</p>
        <div className="tabs" role="group" aria-label="산책 테마">
          <button className={viewId === 'all' ? 'active' : ''} aria-pressed={viewId === 'all'}
            onClick={() => { setSelection(null); window.location.hash = 'all'; }}>전체</button>
          {data.routes.map(item => <button key={item.id} className={item.id === viewId ? 'active' : ''}
            aria-pressed={item.id === viewId} onClick={() => { window.location.hash = item.id; }}>
            {item.label}
          </button>)}
        </div>
        <section className="course">
          <h2>{route?.title ?? '공원과 주변의 모든 장소'}</h2>
          <p>{route?.description ?? '명소부터 카페와 음식점까지, 등록된 장소를 한눈에 둘러보세요.'}</p>
          {route && <span className="tag">{route.durationLabel}</span>}
          <p className="note">{places.filter(place => place.longitude === null).length}곳은 좌표 미등록으로 지도에 표시되지 않습니다.</p>
        </section>
        <div className="listhead"><strong>{route ? '함께 둘러볼 후보 장소' : '전체 장소'}</strong>
          <span>{places.length}곳 · 좌표 {places.filter(place => place.longitude !== null).length}곳</span>
        </div>
        <div id="places">
          {places.map(place => <button key={place.id} className={'place' + (place.id === selected?.id ? ' selected' : '')}
            aria-pressed={place.id === selected?.id} onClick={() => selectPlace(place.id)}>
            <span className="icon">{place.icon}</span>
            <span><strong>{place.nameKo}</strong><small>{coordinateLabel(place)}</small></span>
            <span className="arrow">↗</span>
          </button>)}
        </div>
        <p className="note">ⓘ 후보 목록은 방문 순서가 아닙니다. 실제 위치·운영 여부·보행 동선은 확인이 필요합니다.</p>
      </aside>
      <section className="map" aria-label="일산 호수공원 실제 지도">
        <MapView places={places} selectedPlaceId={selected?.id ?? null} onSelectPlace={selectPlace} center={center} />
        <div className="maptitle"><strong>일산 호수공원 · 산책 지도</strong><small>장소별 좌표 등록·검증 상태를 확인해주세요</small></div>
        {selected && <section className="detail" aria-live="polite">
          <div className="eyebrow">A STOP ALONG THE WAY</div>
          <h3 id="placeTitle">{selected.nameKo}</h3><p>{selected.descriptionKo}</p>
          <span className="tag" id="coordinateStatus">{coordinateLabel(selected)}</span>
          <p className="coordinate-note">{selected.coordinateStatus === 'missing'
            ? '아직 개별 위치가 등록되지 않았습니다. 운영 정보도 방문 전 확인해주세요.'
            : '좌표 출처: ' + selected.source}</p>
          <button onClick={share}>이 보기의 링크 복사 ↗</button>
        </section>}
        <div className="legend">● 제공 좌표가 있는 장소<br />● 숫자는 같은 좌표의 장소 수 · 클릭해 선택<br />● 노란색은 선택한 장소 · 점선은 근사 좌표<br />좌표 미등록 장소는 목록에서 확인<br />실제 도보 경로는 제공하지 않습니다</div>
      </section>
    </main>
    <div className="toast" role="status">{toast}</div>
  </>;
}
