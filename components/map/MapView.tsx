'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel, groupMapPlaces } from '@/lib/data/presentation';
import { siteConfig } from '@/config/site';
import { createElement as createLucideElement } from 'lucide';
import { categoryIcons } from '@/lib/icons';
import type { Locale } from '@/lib/i18n';
import type { RouteBounds } from '@/lib/data/route';

type Props = {
  places: MapPlace[];
  locale: Locale;
  routeLine: FeatureCollection<LineString>;
  routeBounds: RouteBounds | null;
  cameraRequest: number;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  center: [number, number];
};

// Receives validated places and selection; owns only the map's rendering lifecycle.
export default function MapView({ places, locale, routeLine, routeBounds, cameraRequest, selectedPlaceId, onSelectPlace, center }: Props) {
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
        container.current.replaceChildren();
        instance = new libre.Map({
          style: siteConfig.map.styleUrl || 'https://tiles.openfreemap.org/styles/liberty',
          attributionControl: siteConfig.map.attributionControl,
          container: container.current,
          center, zoom: siteConfig.region.zoom,
        });
        instance.addControl(new libre.NavigationControl(), 'top-right');
        instance.addControl(new libre.AttributionControl({ compact: false }), 'bottom-right');
        instance.addControl(new libre.ScaleControl({ unit: 'metric' }), 'bottom-left');
        timer = setTimeout(() => {
          if (!cancelled) setStatus('지도를 불러오지 못했습니다');
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
            setStatus('지도를 불러오지 못했습니다');
          }
        });
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
      } catch {
        if (!cancelled) setStatus('지도를 불러오지 못했습니다');
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
    if (!map || routeLine.features.length === 0) return;
    map.addSource('walking-route', { type: 'geojson', data: routeLine });
    const before = map.getStyle().layers?.find(layer => layer.type === 'symbol')?.id;
    map.addLayer({
      id: 'walking-route-casing', type: 'line', source: 'walking-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 },
    }, before);
    map.addLayer({
      id: 'walking-route-line', type: 'line', source: 'walking-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#26765b', 'line-width': 4 },
    }, before);
    return () => {
      if (!map.getStyle()) return;
      for (const id of ['walking-route-line', 'walking-route-casing']) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource('walking-route')) map.removeSource('walking-route');
    };
  }, [map, routeLine]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const markers: import('maplibre-gl').Marker[] = [];
    void import('maplibre-gl').then(libre => {
      if (cancelled) return;
      for (const group of groupMapPlaces(places)) {
        const shared = group.length > 1;
        for (const [index, place] of group.entries()) {
          const chosen = place.id === selectedPlaceId;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'pin' + (chosen ? ' selected' : '')
            + (place.coordinateStatus === 'approximate' ? ' approximate' : '') + (shared ? ' shared' : '');
          button.dataset.placeIds = place.id;
          button.setAttribute('aria-label', place.nameKo);
          if (shared) button.setAttribute('aria-description', `같은 좌표의 ${group.length}곳. 핀 간격은 화면상 구분용입니다.`);
          button.setAttribute('aria-pressed', String(!!chosen));
          button.style.backgroundColor = place.color;
          button.append(createLucideElement(categoryIcons[place.icon], { width: '20', height: '20', 'aria-hidden': 'true' }));
          const label = document.createElement('span');
          label.className = 'pin-label';
          label.setAttribute('aria-hidden', 'true');
          label.textContent = place.nameKo;
          button.append(label);
          if (place.visitNumbers?.length) {
            const order = document.createElement('span');
            order.className = 'pin-order';
            order.textContent = place.visitNumbers.join('·');
            order.setAttribute('aria-hidden', 'true');
            button.append(order);
            const description = button.getAttribute('aria-description');
            button.setAttribute('aria-description', [description, `${locale === 'ko' ? '방문 순서' : 'Visit order'} ${place.visitNumbers.join('·')}`].filter(Boolean).join(' '));
          }
          button.onclick = () => onSelectPlace(place.id);
          // Pixel spacing only: every marker keeps the original geographic coordinate.
          const angle = index * Math.PI * 2 / group.length - Math.PI / 2;
          const radius = shared ? 30 + group.length * 4 : 0;
          const offset: [number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
          const marker = new libre.Marker({ element: button, offset })
            .setLngLat([place.longitude!, place.latitude!]).addTo(map);
          if (chosen) {
            const content = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = place.nameKo;
            const category = document.createElement('p');
            category.className = 'popup-category';
            category.textContent = place.categoryNameKo;
            const note = document.createElement('p');
            note.textContent = coordinateLabel(place);
            content.append(title, category, note);
            if (shared) {
              const warning = document.createElement('p');
              warning.textContent = locale === 'ko' ? `같은 좌표 ${group.length}곳 · 핀 간격은 화면상 구분용입니다. 개별 위치를 확인해주세요.` : `${group.length} places share these coordinates. Pin spacing is visual only; verify individual locations.`;
              content.append(warning);
            }
            marker.setPopup(new libre.Popup({ closeButton: false, closeOnClick: false, offset: 28 })
              .setDOMContent(content));
            marker.togglePopup();
          }
          markers.push(marker);
        }
      }
    });
    return () => { cancelled = true; markers.forEach(marker => marker.remove()); };
  }, [map, places, selectedPlaceId, onSelectPlace, locale]);

  useEffect(() => {
    if (!map) return;
    const frameRoute = () => {
      if (routeBounds) map.fitBounds(routeBounds, {
        padding: { top: 150, bottom: 100, left: 70, right: 70 },
        maxZoom: siteConfig.region.zoom, duration: 0,
      });
    };
    const place = places.find(item => item.id === selectedPlaceId);
    if (place?.longitude != null && place.latitude !== null) {
      map.easeTo({
        center: [place.longitude, place.latitude], zoom: 16,
        padding: { top: 90, bottom: 330, left: 60, right: 60 },
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700,
      });
    } else if (routeBounds) {
      frameRoute();
    } else {
      map.jumpTo({ center, zoom: siteConfig.region.zoom, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    }
    const onResize = () => { if (!selectedPlaceId) frameRoute(); };
    map.on('resize', onResize);
    return () => { map.off('resize', onResize); };
  }, [map, places, routeBounds, selectedPlaceId, center, cameraRequest]);

  function showAllPins() {
    if (!map) return;
    const groups = groupMapPlaces(places);
    if (!groups.length) return;
    const longitudes = groups.map(group => group[0].longitude!);
    const latitudes = groups.map(group => group[0].latitude!);
    map.fitBounds([
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ], { padding: { top: 150, bottom: selectedPlaceId ? 330 : 100, left: 55, right: 55 }, maxZoom: siteConfig.region.zoom, duration: 0 });
  }

  function retry() {
    setMap(null);
    setStatus('지도를 불러오는 중입니다.');
    setAttempt(value => value + 1);
  }

  return <>
    <div ref={container} id="map" aria-label="확대·축소하고 이동할 수 있는 지도" />
    {map && !status && <button className="map-overview" onClick={showAllPins}>전체 핀 보기</button>}
    {status && <div className="map-status" role="status">{status}
      {status !== '지도를 불러오는 중입니다.' && <button onClick={retry}>다시 시도</button>}
    </div>}
  </>;
}
