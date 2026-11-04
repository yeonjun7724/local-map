import type { FeatureCollection, LineString } from 'geojson';
import type { Place } from './types';

type RoutePoint = Pick<Place, 'id' | 'longitude' | 'latitude'>;

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
