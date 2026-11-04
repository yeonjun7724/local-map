import { z } from 'zod';
import type { FeatureCollection, LineString } from 'geojson';
import type { Place, Route } from './types';

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const metric = z.number().finite().nonnegative().nullable();
const segmentSchema = z.object({
  fromId: z.string(), toId: z.string(), status: z.enum(['ready', 'unavailable']),
  distanceM: metric, durationS: metric, geometry: z.array(coordinate),
  fromSnapDistanceM: metric, toSnapDistanceM: metric,
  reason: z.enum(['missing_coordinates', 'coincident_coordinates', 'snap_too_far', 'same_network_node', 'no_walking_path']).nullable(),
}).strict();
const pathSchema = z.object({
  status: z.enum(['ready', 'partial', 'unavailable']),
  placeIds: z.array(z.string()), inputCoordinates: z.array(coordinate.nullable()),
  totalDistanceM: metric, totalDurationS: metric,
  segments: z.array(segmentSchema), geometry: z.array(coordinate),
}).strict();
const schema = z.object({
  generatedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  source: z.string().min(1), license: z.literal('ODbL 1.0'), walkingSpeedKmh: z.number().finite().positive(),
  networkType: z.literal('walk'), graphRetrievedAt: z.iso.datetime({ offset: true }),
  maxSnapDistanceM: z.number().finite().positive(), osmnxVersion: z.string().min(1),
  routes: z.record(z.string(), pathSchema),
}).strict();
export type RoutePaths = z.infer<typeof schema>;
export type RoutePath = z.infer<typeof pathSchema>;

export function parseRoutePaths(text: string, routes: Route[], places: Place[]): RoutePaths {
  const data = schema.parse(JSON.parse(text.replace(/^\uFEFF/, '')));
  const byId = new Map(places.map(place => [place.id, place]));
  if (Object.keys(data.routes).length !== routes.length || Object.keys(data.routes).some(id => !routes.some(route => route.routeId === id))) {
    throw new Error('route-paths.json: 코스 목록이 다릅니다. 경로를 다시 생성해주세요.');
  }
  for (const route of routes) {
    const path = data.routes[route.routeId];
    const expected = route.placeIds.map(id => {
      const place = byId.get(id)!;
      return place.longitude === null || place.latitude === null ? null : [place.longitude, place.latitude];
    });
    if (!path || JSON.stringify(path.placeIds) !== JSON.stringify(route.placeIds) || JSON.stringify(path.inputCoordinates) !== JSON.stringify(expected)) {
      throw new Error(`route-paths.json '${route.routeId}': 방문 순서 또는 좌표가 변경됐습니다. 경로를 다시 생성해주세요.`);
    }
    if (path.segments.length !== route.placeIds.length - 1) throw new Error('route-paths.json: 구간 수가 일치하지 않습니다');
    for (const [index, segment] of path.segments.entries()) {
      if (segment.fromId !== route.placeIds[index] || segment.toId !== route.placeIds[index + 1]) throw new Error('route-paths.json: 구간 순서가 일치하지 않습니다');
      if (segment.status === 'ready') {
        if (segment.geometry.length < 2 || segment.distanceM === null || segment.distanceM <= 0 || segment.durationS === null || segment.reason !== null
          || segment.fromSnapDistanceM === null || segment.toSnapDistanceM === null
          || Math.max(segment.fromSnapDistanceM, segment.toSnapDistanceM) > data.maxSnapDistanceM) throw new Error('route-paths.json: 유효하지 않은 보행 구간');
        if (Math.abs(segment.durationS - segment.distanceM / (data.walkingSpeedKmh / 3.6)) > 1) throw new Error('route-paths.json: 보행 속도 가정과 시간이 일치하지 않습니다');
      } else if (segment.geometry.length || segment.distanceM !== null || segment.durationS !== null || !segment.reason) {
        throw new Error('route-paths.json: 실패 구간을 정상 경로로 표시할 수 없습니다');
      }
    }
    const ready = path.segments.filter(segment => segment.status === 'ready');
    const status = ready.length === path.segments.length && ready.length > 0 ? 'ready' : ready.length ? 'partial' : 'unavailable';
    if (path.status !== status) throw new Error('route-paths.json: 경로 상태가 일치하지 않습니다');
    if (status === 'ready') {
      if (path.totalDistanceM === null || path.totalDurationS === null || path.geometry.length < 2
        || Math.abs(path.totalDistanceM - ready.reduce((sum, segment) => sum + segment.distanceM!, 0)) > 0.11
        || path.totalDurationS !== ready.reduce((sum, segment) => sum + segment.durationS!, 0)) throw new Error('route-paths.json: 전체 거리·시간이 구간 합과 일치하지 않습니다');
      const joined: [number, number][] = [];
      for (const segment of ready) {
        if (joined.length && JSON.stringify(joined.at(-1)) !== JSON.stringify(segment.geometry[0])) throw new Error('route-paths.json: 구간 geometry가 연결되지 않습니다');
        joined.push(...(joined.length ? segment.geometry.slice(1) : segment.geometry));
      }
      if (JSON.stringify(joined) !== JSON.stringify(path.geometry)) throw new Error('route-paths.json: 전체 geometry가 구간과 일치하지 않습니다');
    } else if (path.totalDistanceM !== null || path.totalDurationS !== null || path.geometry.length) {
      throw new Error('route-paths.json: 미완성 코스에 전체 거리·시간을 표시할 수 없습니다');
    }
  }
  return data;
}

export function buildNetworkRoute(path: RoutePath | undefined, visiblePlaces: readonly Pick<Place, 'id'>[]) {
  const ids = new Set(visiblePlaces.map(place => place.id));
  const filtered = !!path && path.placeIds.some(id => !ids.has(id));
  const geojson: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [] };
  path?.segments.forEach((segment, index) => {
    if (segment.status !== 'ready' || !ids.has(segment.fromId) || !ids.has(segment.toId)) return;
    geojson.features.push({ type: 'Feature', properties: { fromId: segment.fromId, toId: segment.toId, fromStep: index + 1, toStep: index + 2 },
      geometry: { type: 'LineString', coordinates: segment.geometry } });
  });
  return { geojson, filtered };
}
