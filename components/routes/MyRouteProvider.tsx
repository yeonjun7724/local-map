'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type MyRoute = { placeIds: string[]; replace: (ids: string[]) => void; clear: () => void };
const Context = createContext<MyRoute | null>(null);

export function MyRouteProvider({ children }: { children: ReactNode }) {
  const [placeIds, setPlaceIds] = useState<string[]>([]);
  const value = useMemo(() => ({ placeIds, replace: (ids: string[]) => setPlaceIds([...ids]), clear: () => setPlaceIds([]) }), [placeIds]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMyRoute() {
  const value = useContext(Context);
  if (!value) throw new Error('MyRouteProvider is required');
  return value;
}
