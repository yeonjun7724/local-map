import type { FeatureCollection, LineString } from 'geojson';
import type { Place } from './types';

type RoutePoint = Pick<Place, 'id' | 'longitude' | 'latitude'>;
export type RouteBounds = [[number, number], [number, number]];

export function getRouteBounds(places: readonly RoutePoint[]): RouteBounds | null {
  const located = places.filter(place => place.longitude !== null && place.latitude !== null);
  if (!located.length) return null;
  const longitudes = located.map(place => place.longitude!);
  const latitudes = located.map(place => place.latitude!);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

// Connect adjacent visits only. Hidden/missing stops never become shortcuts.
export function buildStraightRoute(placeIds: readonly string[], places: readonly RoutePoint[]) {
  const byId = new Map(places.map(place => [place.id, place]));
  const geojson: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  let missingLegs = 0;
  let coincidentLegs = 0;
  for (let index = 1; index < placeIds.length; index++) {
    const from = byId.get(placeIds[index - 1]);
    const to = byId.get(placeIds[index]);
    if (from?.longitude == null || from.latitude == null || to?.longitude == null || to.latitude == null) {
      missingLegs++;
      continue;
    }
    if (from.longitude === to.longitude && from.latitude === to.latitude) {
      coincidentLegs++;
      continue;
    }
    geojson.features.push({
      type: 'Feature',
      properties: { fromId: from.id, toId: to.id, fromStep: index, toStep: index + 1 },
      geometry: { type: 'LineString', coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]] },
    });
  }
  return { geojson, missingLegs, coincidentLegs };
}
