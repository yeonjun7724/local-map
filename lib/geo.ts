type Located = { id: string; longitude: number | null; latitude: number | null };
export type LngLat = readonly [number, number];

// Used to rank stops, never presented as walking distance or duration.
export function distanceMeters(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180;
  const x = Math.sin((b[1] - a[1]) * rad / 2) ** 2
    + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function nearestNeighborOrder<T extends Located>(places: readonly T[], startId: string | null, center: LngLat): T[] {
  const remaining = places.filter(place => place.longitude !== null && place.latitude !== null);
  const result: T[] = [];
  let current = center;
  while (remaining.length) {
    let index = result.length === 0 && startId ? remaining.findIndex(place => place.id === startId) : -1;
    if (index < 0) {
      index = 0;
      for (let next = 1; next < remaining.length; next++) {
        if (distanceMeters(current, [remaining[next].longitude!, remaining[next].latitude!])
          < distanceMeters(current, [remaining[index].longitude!, remaining[index].latitude!])) index = next;
      }
    }
    const [place] = remaining.splice(index, 1);
    result.push(place);
    current = [place.longitude!, place.latitude!];
  }
  return result;
}
