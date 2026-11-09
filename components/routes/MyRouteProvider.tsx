'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, LineString } from 'geojson';

type RecommendedPath = { geojson: FeatureCollection<LineString>; missingLegs: number; totalDistanceM: number | null; totalDurationS: number | null };
type MyRouteContextValue = { placeIds: string[]; routePath: RecommendedPath | null; routeLoading: boolean; replace: (placeIds: string[]) => void };
const MyRouteContext = createContext<MyRouteContextValue | null>(null);

export function MyRouteProvider({ children }: { children: React.ReactNode }) {
  const [placeIds, replaceIds] = useState<string[]>([]);
  const [routePath, setRoutePath] = useState<RecommendedPath | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const requestId = useRef(0);
  const replace = useCallback((ids: string[]) => {
    const currentRequest = ++requestId.current;
    replaceIds(ids);
    setRoutePath(null);
    setRouteLoading(ids.length > 0);
    if (!ids.length) return;
    fetch('/api/route-path', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeIds: ids }) })
      .then(async response => { if (!response.ok) throw new Error('Could not load walking paths'); return response.json() as Promise<RecommendedPath>; })
      .then(path => { if (requestId.current === currentRequest) setRoutePath(path); })
      .catch(() => { if (requestId.current === currentRequest) setRoutePath({ geojson: { type: 'FeatureCollection', features: [] }, missingLegs: ids.length - 1, totalDistanceM: null, totalDurationS: null }); })
      .finally(() => { if (requestId.current === currentRequest) setRouteLoading(false); });
  }, []);
  const value = useMemo(() => ({ placeIds, routePath, routeLoading, replace }), [placeIds, routePath, routeLoading, replace]);
  return <MyRouteContext.Provider value={value}>{children}</MyRouteContext.Provider>;
}

export function useMyRoute() {
  const value = useContext(MyRouteContext);
  if (!value) throw new Error('useMyRoute must be used inside MyRouteProvider');
  return value;
}
