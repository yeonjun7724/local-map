import type { Place } from './types';

export type PlaceFilters = { category?: string | null; query?: string };

const normalize = (value: string) => value.normalize('NFKC').toLowerCase();

// A fresh array in source order; input records and metadata are never changed.
export function filterPlaces<T extends Place>(places: readonly T[], { category, query = '' }: PlaceFilters): T[] {
  const terms = normalize(query).trim().split(/\s+/u).filter(Boolean);
  return places.filter(place => {
    if (category && category !== 'all' && place.category !== category) return false;
    const text = normalize([place.nameKo, place.nameEn, place.tags, place.address].join(' '));
    return terms.every(term => text.includes(term));
  });
}
