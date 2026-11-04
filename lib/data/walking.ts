import { z } from 'zod';
import type { Place } from './types';
import { parseRoutePaths, type RoutePath, type RoutePaths } from './paths';

export const walkingRequestSchema = z.object({
  placeIds: z.array(z.string().min(1)).min(3).max(7).refine(ids => new Set(ids).size === ids.length),
}).strict();

// Validate just the requested pairs, including their stored input coordinates.
// The full all-pairs dataset is server-only and never sent to the browser.
export function assembleWalkingRoute(raw: unknown, placeIds: string[], places: Place[]): RoutePaths {
  if (!walkingRequestSchema.safeParse({ placeIds }).success) throw new Error('Invalid stop list');
  const byId = new Map(places.map(place => [place.id, place]));
  if (placeIds.some(id => !byId.has(id) || byId.get(id)!.longitude === null || byId.get(id)!.latitude === null)) throw new Error('Unknown or unlocated stop');
  if (!raw || typeof raw !== 'object' || !('routes' in raw) || !raw.routes || typeof raw.routes !== 'object') throw new Error('Missing walking pairs');
  const { routes, ...meta } = raw;
  const legs = placeIds.slice(0, -1).map((fromId, index) => ({ routeId: JSON.stringify([fromId, placeIds[index + 1]]), placeIds: [fromId, placeIds[index + 1]] }));
  const selected = Object.fromEntries(legs.map(leg => [leg.routeId, (routes as Record<string, unknown>)[leg.routeId]]));
  const checked = parseRoutePaths(JSON.stringify({ ...meta, routes: selected }), legs, places);
  const segments = legs.map(leg => checked.routes[leg.routeId].segments[0]);
  const ready = segments.filter(segment => segment.status === 'ready');
  const complete = ready.length === segments.length;
  const geometry: RoutePath['geometry'] = [];
  if (complete) for (const segment of segments) {
    if (geometry.length && JSON.stringify(geometry.at(-1)) !== JSON.stringify(segment.geometry[0])) throw new Error('Discontinuous walking pairs');
    geometry.push(...(geometry.length ? segment.geometry.slice(1) : segment.geometry));
  }
  const path: RoutePath = {
    status: complete ? 'ready' : ready.length ? 'partial' : 'unavailable', placeIds,
    inputCoordinates: placeIds.map(id => [byId.get(id)!.longitude!, byId.get(id)!.latitude!]),
    segments, geometry,
    totalDistanceM: complete ? Math.round(ready.reduce((sum, leg) => sum + leg.distanceM!, 0) * 10) / 10 : null,
    totalDurationS: complete ? ready.reduce((sum, leg) => sum + leg.durationS!, 0) : null,
  };
  return parseRoutePaths(JSON.stringify({ ...meta, routes: { 'my-route': path } }), [{ routeId: 'my-route', placeIds }], places);
}
