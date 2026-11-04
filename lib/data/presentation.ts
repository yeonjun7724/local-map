import type { AtlasData, MapPlace, Place } from './types';

export function visiblePlaces(data: AtlasData, routeId: string): MapPlace[] {
  const byCategory = new Map(data.categories.map(category => [category.id, category]));
  const decorate = (place: Place): MapPlace => ({
    ...place,
    icon: byCategory.get(place.category)!.icon,
    color: byCategory.get(place.category)!.color,
  });
  const route = data.routes.find(item => item.id === routeId);
  if (route) {
    const byId = new Map(data.places.map(place => [place.id, place]));
    return route.stops.map(stop => ({
      ...decorate(byId.get(stop.placeId)!), descriptionKo: stop.description,
    }));
  }
  return data.places.map(decorate);
}

// Preserve the supplied coordinates; coincident places share a selectable pin.
export function groupMapPlaces(places: MapPlace[]): MapPlace[][] {
  const groups = new Map<string, MapPlace[]>();
  for (const place of places) {
    if (place.longitude === null || place.latitude === null) continue;
    const key = `${place.longitude},${place.latitude}`;
    const group = groups.get(key) ?? [];
    group.push(place);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function coordinateLabel(place: Place) {
  switch (place.coordinateStatus) {
    case 'missing': return '좌표 미등록 · 지도 표시 없음';
    case 'approximate': return '근사 좌표 · 현장 확인 필요';
    case 'verified': return '검증된 좌표 · 운영 정보 확인 필요';
    default: return '제공 좌표 · 현장 확인 필요';
  }
}
