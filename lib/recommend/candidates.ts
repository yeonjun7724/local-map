import type { AtlasData } from '../data/types';
import { nearestNeighborOrder, type LngLat } from '../geo';
import type { Candidate, Conditions } from './types';

export function makeCandidates(data: AtlasData, conditions: Conditions, center: LngLat): Candidate[] {
  const eligible = data.places.filter(place => place.longitude !== null && place.latitude !== null).map(place => ({
    ...place,
    recommendThemes: [...new Set([place.theme, ...data.routes.filter(route => route.placeIds.includes(place.id)).map(route => route.theme)].filter(Boolean))],
  }));
  if (conditions.startId && !eligible.some(place => place.id === conditions.startId)) return [];
  const ordered = nearestNeighborOrder(eligible, conditions.startId, center);
  // Stable priority: requested start, then preferred theme, then proximity.
  ordered.sort((a, b) => {
    const priority = (place: Candidate) => place.id === conditions.startId ? -2
      : conditions.theme && place.recommendThemes.includes(conditions.theme) ? -1 : 0;
    return priority(a) - priority(b);
  });
  return ordered.slice(0, 30);
}
