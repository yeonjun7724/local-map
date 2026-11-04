'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseRoutePaths, type RoutePaths } from '@/lib/data/paths';
import type { Place } from '@/lib/data/types';

type RouteState = { placeIds: string[]; paths?: RoutePaths; status: 'idle' | 'loading' | 'ready' | 'error' };
type MyRoute = RouteState & { replace: (ids: string[]) => void; clear: () => void; retry: () => void };
const Context = createContext<MyRoute | null>(null);

export function MyRouteProvider({ children, places }: { children: ReactNode; places: Place[] }) {
  const [route, setRoute] = useState<RouteState>({ placeIds: [], status: 'idle' });
  const [revision, setRevision] = useState(0);
  const placeIds = route.placeIds;
  useEffect(() => {
    if (!placeIds.length) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/route-path', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeIds }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) throw new Error('Walking path unavailable');
        const paths = parseRoutePaths(JSON.stringify(await response.json()), [{ routeId: 'my-route', placeIds }], places);
        if (!controller.signal.aborted) setRoute(current => current.placeIds === placeIds ? { placeIds, paths, status: 'ready' } : current);
      } catch { if (!controller.signal.aborted) setRoute(current => current.placeIds === placeIds ? { placeIds, status: 'error' } : current); }
    }
    void load();
    return () => controller.abort();
  }, [placeIds, places, revision]);
  const value = useMemo(() => ({ ...route,
    replace: (ids: string[]) => setRoute({ placeIds: [...ids], status: 'loading' }),
    clear: () => setRoute({ placeIds: [], status: 'idle' }),
    retry: () => { setRoute(current => ({ placeIds: current.placeIds, status: 'loading' })); setRevision(value => value + 1); },
  }), [route]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMyRoute() {
  const value = useContext(Context);
  if (!value) throw new Error('MyRouteProvider is required');
  return value;
}
