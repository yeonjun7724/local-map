import type { Place } from './data/types';

type LocatedPlace = Pick<Place, 'id' | 'latitude' | 'longitude'>;

export function distanceKm(a: Pick<LocatedPlace, 'latitude' | 'longitude'>, b: Pick<LocatedPlace, 'latitude' | 'longitude'>) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b.latitude! - a.latitude!);
  const longitudeDelta = radians(b.longitude! - a.longitude!);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude!)) * Math.cos(radians(b.latitude!)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function nearestNeighborOrder<T extends LocatedPlace>(places: readonly T[], start: Pick<LocatedPlace, 'latitude' | 'longitude'>) {
  const remaining = [...places];
  const ordered: T[] = [];
  let point = start;
  while (remaining.length) {
    let nearestIndex = 0;
    for (let index = 1; index < remaining.length; index++) {
      if (distanceKm(point, remaining[index]) < distanceKm(point, remaining[nearestIndex])) nearestIndex = index;
    }
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    point = next;
  }
  return ordered;
}
