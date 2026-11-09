'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type MyRouteContextValue = { placeIds: string[]; replace: (placeIds: string[]) => void };
const MyRouteContext = createContext<MyRouteContextValue | null>(null);

export function MyRouteProvider({ children }: { children: React.ReactNode }) {
  const [placeIds, replace] = useState<string[]>([]);
  const value = useMemo(() => ({ placeIds, replace }), [placeIds]);
  return <MyRouteContext.Provider value={value}>{children}</MyRouteContext.Provider>;
}

export function useMyRoute() {
  const value = useContext(MyRouteContext);
  if (!value) throw new Error('useMyRoute must be used inside MyRouteProvider');
  return value;
}
