import type { AtlasData, MapPlace, Place } from './types';

export function visiblePlaces(data: AtlasData, routeId: string, customIds?: string[]): MapPlace[] {
  const byCategory = new Map(data.categories.map(category => [category.id, category]));
  const decorate = (place: Place): MapPlace => ({
    ...place,
    icon: byCategory.get(place.category)!.icon,
    color: byCategory.get(place.category)!.color,
    categoryNameKo: byCategory.get(place.category)!.nameKo,
  });
  const route = data.routes.find(item => item.routeId === routeId);
  const placeIds = customIds ?? route?.placeIds;
  if (placeIds) {
    const byId = new Map(data.places.map(place => [place.id, place]));
    // A start/end revisit stays in the itinerary but needs only one card and pin.
    return [...new Set(placeIds)].filter(id => byId.has(id)).map(placeId => ({
      ...decorate(byId.get(placeId)!),
      visitNumbers: placeIds.flatMap((id, index) => id === placeId ? [index + 1] : []),
    }));
  }
  return data.places.map(decorate);
}

// Group coincident coordinates for visual spacing without changing coordinates.
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
