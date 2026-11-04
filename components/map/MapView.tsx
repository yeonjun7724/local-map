'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap } from 'maplibre-gl';
import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel, groupMapPlaces } from '@/lib/data/presentation';

type Props = {
  places: MapPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  center: [number, number];
};

// Receives validated places and selection; owns only the map's rendering lifecycle.
export default function MapView({ places, selectedPlaceId, onSelectPlace, center }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LibreMap | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<string | null>('지도를 불러오는 중입니다.');

  useEffect(() => {
    let cancelled = false;
    let instance: LibreMap | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    void (async () => {
      try {
        const libre = await import('maplibre-gl');
        if (cancelled || !container.current) return;
        libre.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
        instance = new libre.Map({
          container: container.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center, zoom: 14.5, attributionControl: false,
        });
        instance.addControl(new libre.NavigationControl(), 'top-right');
        instance.addControl(new libre.AttributionControl({ compact: false }), 'bottom-right');
        instance.addControl(new libre.ScaleControl({ unit: 'metric' }), 'bottom-left');
        timer = setTimeout(() => {
          if (!cancelled) setStatus('지도 로딩이 지연되고 있습니다. 연결을 확인하고 다시 시도해주세요.');
        }, 20000);
        instance.on('load', () => {
          if (cancelled) return;
          clearTimeout(timer);
          setMap(instance!);
          setStatus(null);
        });
        instance.on('error', () => {
          if (!cancelled) {
            clearTimeout(timer);
            setStatus('지도 데이터를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
          }
        });
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
      } catch {
        if (!cancelled) setStatus('지도를 시작할 수 없습니다. 인터넷 연결과 브라우저의 WebGL 지원을 확인해주세요.');
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer?.disconnect();
      instance?.remove();
    };
  }, [center, attempt]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const markers: import('maplibre-gl').Marker[] = [];
    void import('maplibre-gl').then(libre => {
      if (cancelled) return;
      for (const group of groupMapPlaces(places)) {
        const chosen = group.find(place => place.id === selectedPlaceId);
        const place = chosen ?? group[0];
        const shared = group.length > 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pin' + (chosen ? ' selected' : '')
          + (place.coordinateStatus === 'approximate' ? ' approximate' : '') + (shared ? ' shared' : '');
        button.dataset.placeIds = group.map(item => item.id).join(',');
        button.setAttribute('aria-label', shared
          ? `같은 좌표의 ${group.length}곳 선택: ${group.map(item => item.nameKo).join(', ')}`
          : `${place.nameKo} 상세 보기, ${coordinateLabel(place)}`);
        button.setAttribute('aria-pressed', String(!!chosen));
        button.textContent = shared ? String(group.length) : place.icon;
        const label = document.createElement('span');
        label.textContent = shared ? `같은 좌표 ${group.length}곳` : place.nameKo;
        button.append(label);
        button.onclick = () => onSelectPlace(place.id);
        const marker = new libre.Marker({ element: button })
          .setLngLat([place.longitude!, place.latitude!]).addTo(map);
        if (chosen) {
          const content = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = place.nameKo;
          const note = document.createElement('p');
          note.textContent = coordinateLabel(place);
          content.append(title, note);
          if (shared) {
            const warning = document.createElement('p');
            warning.textContent = `같은 좌표로 등록된 ${group.length}곳입니다. 개별 위치를 확인해주세요.`;
            content.append(warning);
            const choices = document.createElement('div');
            choices.className = 'shared-place-choices';
            for (const item of group) {
              const choice = document.createElement('button');
              choice.type = 'button';
              choice.textContent = item.nameKo;
              choice.setAttribute('aria-pressed', String(item.id === selectedPlaceId));
              choice.onclick = () => onSelectPlace(item.id);
              choices.append(choice);
            }
            content.append(choices);
          }
          marker.setPopup(new libre.Popup({ closeButton: false, closeOnClick: false, offset: 28 })
            .setDOMContent(content));
          marker.togglePopup();
        }
        markers.push(marker);
      }
    });
    return () => { cancelled = true; markers.forEach(marker => marker.remove()); };
  }, [map, places, selectedPlaceId, onSelectPlace]);

  useEffect(() => {
    if (!map) return;
    const place = places.find(item => item.id === selectedPlaceId);
    if (place?.longitude != null && place.latitude !== null) {
      map.easeTo({
        center: [place.longitude, place.latitude], zoom: 16,
        padding: { top: 90, bottom: 330, left: 60, right: 60 },
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
      });
    } else if (selectedPlaceId === null) {
      const located = places.filter(place => place.longitude !== null && place.latitude !== null);
      if (located.length > 0) {
        const longitudes = located.map(place => place.longitude!);
        const latitudes = located.map(place => place.latitude!);
        map.fitBounds([
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ], { padding: { top: 150, bottom: 100, left: 55, right: 55 }, maxZoom: 16, duration: 0 });
      } else {
        map.jumpTo({ center, zoom: 14.5, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
      }
    } else {
      map.jumpTo({ center, zoom: 14.5, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }
  }, [map, places, selectedPlaceId, center]);

  function retry() {
    setMap(null);
    setStatus('지도를 불러오는 중입니다.');
    setAttempt(value => value + 1);
  }

  return <>
    <div ref={container} id="map" aria-label="확대·축소하고 이동할 수 있는 지도" />
    {status && <div className="map-status" role="status">{status}
      {status !== '지도를 불러오는 중입니다.' && <button onClick={retry}>지도 다시 시도</button>}
    </div>}
  </>;
}
